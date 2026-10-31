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
//   kaliplar:  [{ id, ad, tur: "Kalıp"|"Bıçak", makineId, adet (boş = ortak), bedenSaatlik: { "<beden adı>": saatlik adet } }]
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
  // AYNI ANDA ÇALIŞAN MAKİNE (v1.703.1 — kullanıcı: "3 adet pres var, bıçaklar 3'ünde de kullanılabilir; makineyi
  // kesim makinesi olarak ekler adet artırırım, bıçaklar ortak"). Aynı tip makineler TEK kayıt + Adet. Kalıp/bıçak o
  // kayda bağlanınca tüm preslerde ortak; ama bir bıçak aynı anda tek preste durur — kalıpta Adet girilmişse çalışan
  // pres sayısı en az olanla sınırlanır. Boş Adet = "yeterince var", sınır yok.
  const makineAdet = Math.max(1, sayiYa(makine.adet) || 1);
  const adet = Math.min(makineAdet, ...kaliplar.map((k) => sayiYa(k.adet) || makineAdet));
  const gunlukSaat = sayiYa(makine.gunlukSaat) || 8;
  return { makine, kaliplar, calisanMakine: adet, saatlik: saatlik * adet, gunluk: saatlik * adet * gunlukSaat, gunlukSaat };
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

function KapasiteTanimi({ tanimlar, onSave, cariler, stok, onCariHareketEkle, onParaFisiKes, showToast }) {
  const kt = kapasiteTanimi(tanimlar);
  const yaz = (alan, liste) => onSave({ ...tanimlar, kapasite: { ...kt, [alan]: liste } });
  const prosesAdlari = (tanimlar.prosesler || []).map((p) => p.ad);
  const bedenAdlari = (tanimlar.bedenler || []).filter((b) => (b.tip || "Beden") === "Beden").map((b) => b.ad);
  const personeller = (cariler || []).filter((c) => c.tip === "Personel" && !c.pasif);
  const [yeniMakine, setYeniMakine] = useState("");
  // PROSES PROSES (v1.704.1 — kullanıcı: "Kapasiteyi proses proses yapalım"): üstte proses sekmeleri; her sekmede
  // yalnız o prosesin makineleri, onlara bağlı kalıp/bıçaklar ve o proseste çalışan elemanlar. Yeni makine açık
  // sekmenin prosesiyle doğar. "Tümü" eski düz görünüm. Veri aynı (makine.prosesler, eleman.prosesler) — yalnız süzgeç.
  const [kp, setKp] = useState(() => { try { return localStorage.getItem("kapasite-proses") || ""; } catch (e) { return ""; } });
  const p = prosesAdlari.includes(kp) ? kp : "";
  const kpSec = (x) => { setKp(x); try { localStorage.setItem("kapasite-proses", x); } catch (e) { /* yoksay */ } };
  const makinelerG = p ? kt.makineler.filter((m) => (m.prosesler || []).includes(p)) : kt.makineler;
  const makineIdG = new Set(makinelerG.map((m) => m.id));
  const kaliplarG = p ? kt.kaliplar.filter((k) => makineIdG.has(k.makineId)) : kt.kaliplar;
  const elemanProsesleri = (id) => ((kt.elemanlar.find((e) => e.cariId === id) || {}).prosesler || []);
  const personellerG = p ? personeller.filter((c) => elemanProsesleri(c.id).includes(p)) : personeller;
  const eklenebilirPersonel = p ? personeller.filter((c) => !elemanProsesleri(c.id).includes(p)) : [];
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
    yaz("makineler", [...kt.makineler, { id: uid("mak"), ad, prosesler: p ? [p] : [], adet: 1, gunlukSaat: 9, saatlikAdet: "" }]);
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["", ...prosesAdlari].map((x) => {
          const on = x === p;
          const n = x ? kt.makineler.filter((m) => (m.prosesler || []).includes(x)).length : kt.makineler.length;
          return (
            <button key={x || "tumu"} type="button" data-kapasite-sekme={x || "Tümü"} onClick={() => kpSec(x)}
              style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${on ? "#6B7A8F" : "var(--erp-border)"}`, background: on ? "#6B7A8F1A" : "#fff", color: on ? "#6B7A8F" : "var(--erp-text)" }}>
              {x || "Tümü"}{n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>
      <div>
        <TanimBasligi ad="Makine / Teçhizat" />
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
          Her makinenin hangi proseste kullanıldığını, kaç tane olduğunu ve günde kaç saat çalıştığını girin.
          Aynı tip makineleri (3 pres gibi) <b>tek kayıt</b> yapıp Adet'i artırın; kalıp ve bıçaklar hepsinde ortak kullanılır.
          Kalıpsız işlerde (dikiş gibi) saatlik adet makinenin kendi hızıdır; kalıplı işte hızı kalıp belirler.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input data-makine-yeni value={yeniMakine} onChange={(e) => setYeniMakine(e.target.value)} onKeyDown={(e) => e.key === "Enter" && makineEkle()}
            placeholder="Örn. Kesim Makinesi 1" style={{ ...inputStyle, width: 220 }} />
          <button type="button" className="btn-primary" data-makine-ekle onClick={makineEkle}><Plus size={14} /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {p && makinelerG.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{p} prosesinde makine yok — yukarıdan ekleyin.</div>}
          {makinelerG.map((m) => (
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
              <DemirbasBolumu kayit={m} tur="Makine" tanimlar={tanimlar} cariler={cariler} stok={stok} onGuncelle={(d) => makineGuncelle(m.id, d)}
                onCariHareketEkle={onCariHareketEkle} onParaFisiKes={onParaFisiKes} showToast={showToast} />
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
            {makinelerG.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
          </select>
          <button type="button" className="btn-primary" data-kalip-ekle onClick={kalipEkle}><Plus size={14} /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {kaliplarG.map((k) => (
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--erp-text-2)" }}>
                Adet
                <input inputMode="numeric" data-kalip-adet value={k.adet ?? ""} placeholder="ortak"
                  onChange={(e) => kalipGuncelle(k.id, { adet: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>boş = makinenin tüm adetlerinde ortak; 1 girerseniz aynı anda tek makinede çalışır</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Saatlik adet — beden beden (tek makinede)</div>
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
              <DemirbasBolumu kayit={k} tur={k.tur || "Kalıp"} tanimlar={tanimlar} cariler={cariler} stok={stok} onGuncelle={(d) => kalipGuncelle(k.id, d)}
                onCariHareketEkle={onCariHareketEkle} onParaFisiKes={onParaFisiKes} showToast={showToast} />
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
          {p && eklenebilirPersonel.length > 0 && (
            <select data-kapasite-eleman-ekle value="" onChange={(e) => e.target.value && elemanGuncelle(e.target.value, { prosesler: [...elemanProsesleri(e.target.value), p] })}
              style={{ ...inputStyle, width: 240 }}>
              <option value="">+ {p} prosesine eleman ekle…</option>
              {eklenebilirPersonel.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
            </select>
          )}
          {personellerG.map((c) => {
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

// ================= DEMİRBAŞ: ALIM, AMORTİSMAN, ÜRÜN PAYI (v1.705.0) =================
// Kullanıcı: "Makine, kalıp, bıçak satın alınırken ürün bağlantısı yapılabilir ve makine, kalıp… giderleri olarak
// işlenir." Kararlar (kullanıcı seçti): alım hem cari › Ürünsüz kayıt'tan hem Tanımlar › Kapasite'den girilir;
// gider AMORTİSMANLA (girilen ay sayısına bölünüp her ay); ürün bağı maliyete PAY olarak girer.
//
// TEK KAYNAK = CARİ HAREKETİ. Alım, tedarikçiye normal "Alış" hareketi (fişli, cariye borç) ve üzerinde
// `demirbas: { id, tur, ad, amortismanAy }`. Ayrı bir alım listesi tutulmaz — iki kaynak ayrışırdı; hareket silinirse
// amortisman ve pay da kendiliğinden düşer. Alış hareketi Gelir/Gider'e TAM yazılmaz (alışlar zaten kâr/zarara
// girmiyor); gider yalnız aylık amortisman payıdır → çift sayım yok.
// ÜRÜN PAYI: kalıp/makinenin toplam alım tutarı ÷ "ömür (çift)". Hangi ürünlere? Ürün kartı › Kapasite'de o kalıbı/
// makineyi kullanan ürünler + kalıp kartında elle bağlanan ürünler (`urunIdler`). Ömür girilmemişse pay yok.

function demirbasKaydi(tanimlar, id) {
  const kt = kapasiteTanimi(tanimlar);
  const m = kt.makineler.find((x) => x.id === id);
  if (m) return { tur: "Makine", kayit: m };
  const k = kt.kaliplar.find((x) => x.id === id);
  return k ? { tur: k.tur || "Kalıp", kayit: k } : null;
}

function demirbasTL(h, kurlar) {
  const pb = h.paraBirimi || "TRY";
  const kur = pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0;
  return (Number(h.tutar) || 0) * kur;
}

// Bütün demirbaş alımları: [{ h, cari }]
function demirbasAlimlari(cariler) {
  const l = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => { if (h.demirbas && h.demirbas.id) l.push({ h, cari: c }); }));
  return l;
}

// Bir alımın aralığa düşen amortismanı: tutar ÷ ay; alım ayından başlayıp `ay` ay. Ayın 1'i aralıktaysa o ay sayılır.
function amortismanAraligi(tutarTL, tarih, ay, aralik) {
  const n = Math.max(1, Math.round(Number(ay) || 1));
  const t = new Date(tarih || Date.now());
  if (Number.isNaN(t.getTime())) return 0;
  let toplam = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
    if (d >= new Date(aralik.bas.getFullYear(), aralik.bas.getMonth(), 1) && d <= aralik.son) toplam += tutarTL / n;
  }
  return Math.round(toplam * 100) / 100;
}

// Dönem amortismanı, gider kartı adına göre: { toplam, kartlar: { "Kalıp Amortismanı": x } }
function donemAmortismani(cariler, kurlar, aralik, kapsar) {
  const kartlar = {}; let toplam = 0;
  demirbasAlimlari(cariler).forEach(({ h }) => {
    if (kapsar && !kapsar(h.defter)) return;
    const v = amortismanAraligi(demirbasTL(h, kurlar), h.tarih, h.demirbas.amortismanAy, aralik);
    if (!v) return;
    const ad = `${h.demirbas.tur || "Demirbaş"} Amortismanı`;
    kartlar[ad] = Math.round(((kartlar[ad] || 0) + v) * 100) / 100;
    toplam += v;
  });
  return { toplam: Math.round(toplam * 100) / 100, kartlar };
}

// Ürünün çift başı demirbaş payı: { toplam, satirlar: [{ ad, tur, alim, omur, pay }] }
function urunDemirbasPayi(urun, tanimlar, cariler, kurlar) {
  if (!urun || !tanimlar) return { toplam: 0, satirlar: [] };
  const kt = kapasiteTanimi(tanimlar);
  const idler = new Set();
  Object.values(urun.kapasite || {}).forEach((b) => { if (!b) return; if (b.makineId) idler.add(b.makineId); (b.kalipIdler || []).forEach((x) => idler.add(x)); });
  [...kt.makineler, ...kt.kaliplar].forEach((x) => { if ((x.urunIdler || []).includes(urun.id)) idler.add(x.id); });
  const alimlar = demirbasAlimlari(cariler);
  const satirlar = [];
  idler.forEach((id) => {
    const d = demirbasKaydi(tanimlar, id);
    if (!d) return;
    const omur = sayiYa(d.kayit.omurAdet);
    const alim = alimlar.filter((a) => a.h.demirbas.id === id).reduce((t, a) => t + demirbasTL(a.h, kurlar), 0);
    if (!omur || !alim) return;
    satirlar.push({ ad: d.kayit.ad, tur: d.tur, alim: Math.round(alim * 100) / 100, omur, pay: Math.round((alim / omur) * 10000) / 10000 });
  });
  return { toplam: Math.round(satirlar.reduce((t, s) => t + s.pay, 0) * 100) / 100, satirlar };
}

// Tanımlar › Kapasite kartlarının altındaki demirbaş bölümü: ömür, ürün bağı, alımlar, "Satın alındı".
function DemirbasBolumu({ kayit, tur, tanimlar, cariler, stok, onGuncelle, onCariHareketEkle, onParaFisiKes, showToast }) {
  const [acik, setAcik] = useState(false);
  const [f, setF] = useState({ cariId: "", tutar: "", paraBirimi: "TRY", tarih: bugunYerel(), ay: "24", defter: "Genel" });
  const alimlar = demirbasAlimlari(cariler).filter((a) => a.h.demirbas.id === kayit.id);
  const mamuller = (stok || []).filter((p) => p.tip === "Mamul" && !p.pasif);
  const bagli = kayit.urunIdler || [];
  const tedarikciler = (cariler || []).filter((c) => c.tip !== "Personel" && c.tip !== "Müşteri" && !c.pasif);
  const kaydediliyorRef = useRef(false);
  const kaydet = async () => {
    const tutar = parseFloat(String(f.tutar).replace(",", "."));
    if (!f.cariId || !(tutar > 0)) { if (showToast) showToast("Tedarikçi ve tutar girin"); return; }
    if (kaydediliyorRef.current) return;   // çift basış: aynı alım iki fiş olmasın
    const ay = Math.max(1, parseInt(f.ay, 10) || 1);
    const hareket = {
      tarih: f.tarih, yon: hareketYonu("Alış"), tutar, paraBirimi: f.paraBirimi, odemeSekli: "Nakit", vade: "", defter: f.defter,
      islemTipi: "Alış", aciklama: `${tur} alımı — ${kayit.ad}`, kullanici: islemKullanicisiAd(),
      demirbas: { id: kayit.id, tur, ad: kayit.ad, amortismanAy: ay },
    };
    // TEK FİŞ DEFTERİ (v1.742.0 — kural provası buldu): demirbaş alımı eski yoldan (addCariHareketFromStok → car_yaz) yazıyordu;
    // kurallar açılınca reddedilirdi. Sunucu yolunda ürünsüz alış fişi (AF), numarayı sunucu verir — cari kartındaki ürünsüz alışla aynı.
    if (fisKesYolu() && onParaFisiKes) {
      kaydediliyorRef.current = true;
      let sonuc;
      try {
        sonuc = await onParaFisiKes({
          fis: { tur: "Alış", onek: paraFisOneki("Alış"), kaynak: "Demirbaş alımı", ek: { demirbasId: kayit.id } },
          cariId: f.cariId, hareketler: [{ ...hareket, islemTipi: undefined, fisNo: FIS_YER }],
          anahtar: `demirbas|${kayit.id}`, hataEtiketi: `${kayit.ad} alımı`,
        });
      } finally { kaydediliyorRef.current = false; }
      if (!sonuc) return;
    } else {
      const ok = onCariHareketEkle(f.cariId, [hareket]);
      if (ok === false) return;
    }
    setF({ ...f, tutar: "" }); setAcik(false);
    if (showToast) showToast(`${kayit.ad} alımı cariye yazıldı — ${ay} ay amortisman`);
  };
  return (
    <div data-demirbas={kayit.ad} style={{ borderTop: "1px dashed var(--erp-line-soft)", paddingTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "var(--erp-text-3)" }}>Ömür (çift)</span>
        <input inputMode="numeric" data-demirbas-omur value={kayit.omurAdet ?? ""} placeholder="ör. 20000"
          onChange={(e) => onGuncelle({ omurAdet: e.target.value })} style={{ ...inputStyle, width: 90 }} />
        <select data-demirbas-urun value="" onChange={(e) => e.target.value && onGuncelle({ urunIdler: [...bagli, e.target.value] })} style={{ ...inputStyle, width: 200 }}>
          <option value="">+ Ürün bağla…</option>
          {mamuller.filter((p) => !bagli.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}
        </select>
        {bagli.map((id) => {
          const p = (stok || []).find((x) => x.id === id);
          return (
            <span key={id} style={{ padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-line-soft)" }}>
              {p ? p.ad : "?"} <button type="button" onClick={() => onGuncelle({ urunIdler: bagli.filter((x) => x !== id) })}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>×</button>
            </span>
          );
        })}
        {onCariHareketEkle && (
          <button type="button" className="btn-ghost" data-demirbas-satin-al onClick={() => setAcik(!acik)} style={{ marginLeft: "auto" }}>
            Satın alındı…
          </button>
        )}
      </div>
      {alimlar.map(({ h, cari }) => (
        <div key={h.id} style={{ color: "var(--erp-text-2)" }}>
          {h.tarih} · {cari.unvan} · <b>{(Number(h.tutar) || 0).toLocaleString("tr-TR")} {h.paraBirimi || "TRY"}</b> · {h.demirbas.amortismanAy} ay amortisman · <span className="mono">{h.fisNo}</span>
        </div>
      ))}
      {acik && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", background: "var(--erp-page)", padding: 8, borderRadius: "var(--erp-r-md)" }}>
          <Field label="Tedarikçi">
            <select data-demirbas-cari value={f.cariId} onChange={(e) => setF({ ...f, cariId: e.target.value })} style={{ ...inputStyle, width: 200 }}>
              <option value="">Seçin…</option>
              {tedarikciler.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
            </select>
          </Field>
          <Field label="Tutar"><input inputMode="decimal" data-demirbas-tutar value={f.tutar} onChange={(e) => setF({ ...f, tutar: e.target.value })} style={{ ...inputStyle, width: 100 }} /></Field>
          <Field label="PB">
            <select value={f.paraBirimi} onChange={(e) => setF({ ...f, paraBirimi: e.target.value })} style={{ ...inputStyle, width: 70 }}>
              {["TRY", "USD", "EUR"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Tarih"><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} style={{ ...inputStyle, width: 140 }} /></Field>
          <Field label="Amortisman (ay)"><input inputMode="numeric" data-demirbas-ay value={f.ay} onChange={(e) => setF({ ...f, ay: e.target.value })} style={{ ...inputStyle, width: 70 }} /></Field>
          <Field label="Defter">
            <select value={f.defter} onChange={(e) => setF({ ...f, defter: e.target.value })} style={{ ...inputStyle, width: 90 }}>
              <option>Genel</option><option>Resmi</option>
            </select>
          </Field>
          <button type="button" className="btn-primary" data-demirbas-kaydet onClick={kaydet}>Cariye yaz</button>
        </div>
      )}
    </div>
  );
}
