// ================= EKRAN DÜZENİ — DÜZENLEME KİPİ (29 Eylül, v1.522.0) =================
//
// Kullanıcı: "Sürükle gibi butonların yerini taşıyabileceğimiz, boyutlarını değiştirebileceğimiz v.s. tüm uygulama
// için." Önerilen 2. adım (kullanıcı: "Evet, 2. adıma başla"): ekranlar BLOKLARA ayrılır; "Düzen" düğmesiyle
// düzenleme kipine girilince her bloğun üstünde bir çubuk belirir:
//   ⠿ tutamak  → basılı tutup sürükleyerek sırala (fare + dokunmatik: pointer olayları; HTML5 sürükle-bırak
//                telefonda çalışmıyor — 385 mobil görünüm düzenleyicisiyle aynı ders)
//   ↑ ↓        → sürükleyemeyenler için
//   genişlik   → Dar (⅓) / Yarım (½) / Tam — yan yana dizilen bloklar bir satırı paylaşır
//   göz        → gizle / göster (gizli blok kipte soluk görünür, geri açılabilsin)
//   Kaydet / Vazgeç / Varsayılana dön
//
// NEDEN BLOK, NEDEN SERBEST DEĞİL: serbest (piksel piksel) yerleşim telefonda ve masaüstünde aynı anda doğru
// kalamaz ve yeni özellik geldikçe bozulur. Blok düzeni ızgarada akar; dar ekranda (<760 px) Dar/Yarım bloklar
// kendiliğinden tam genişliğe iner (100-app'teki `.duzen-*` kuralları).
//
// KAYIT: `tanimlar.ekranDuzenleri[ekran] = [{ id, genislik, gizli }]` (sıralı). BULUTTA — bütün cihazlar aynı
// düzeni görür (boyut ayarı cihaz başınaydı; düzen ise iş akışının kendisi). Kayıtta olmayan yeni blok kendi
// varsayılanıyla sona eklenir; kodda artık olmayan blok kayıttan yok sayılır — ayar hiçbir zaman ekranı kırmaz.
//
// YETKİ: Tanımlar'ı görebilen kullanıcı (bağlamdaki `yetkili`). Düzen herkesi etkiliyor.
//
// BAĞLAM: App `EkranDuzeniBaglami.Provider` ile { duzenler, kaydet, yetkili } veriyor. Bağlam yoksa (test, eski
// çağıran) blokları varsayılan düzende çizer, Düzen düğmesi çıkmaz.

const EkranDuzeniBaglami = React.createContext(null);

const DUZEN_GENISLIKLERI = [
  { k: "dar", ad: "Dar", sutun: 4 },
  { k: "yarim", ad: "Yarım", sutun: 6 },
  { k: "tam", ad: "Tam", sutun: 12 },
];

// Kodun blok listesi + kayıtlı düzen → çizilecek sıra. Saf; birim testli.
function ekranDuzeniCoz(bloklar, kayit) {
  const kodda = new Map((bloklar || []).map((b) => [b.id, b]));
  const gecerliGenislik = (g, v) => (DUZEN_GENISLIKLERI.some((x) => x.k === g) ? g : (v || "tam"));
  const sonuc = [];
  const eklenen = new Set();
  (Array.isArray(kayit) ? kayit : []).forEach((k) => {
    if (!k || !kodda.has(k.id) || eklenen.has(k.id)) return;
    const b = kodda.get(k.id);
    sonuc.push({ id: b.id, genislik: gecerliGenislik(k.genislik, b.genislik), gizli: !!k.gizli && !b.gizlenemez });
    eklenen.add(b.id);
  });
  (bloklar || []).forEach((b) => {
    if (eklenen.has(b.id)) return;
    sonuc.push({ id: b.id, genislik: gecerliGenislik(b.genislik, "tam"), gizli: false });
  });
  return sonuc;
}

// Sürüklemede/oklarda bir bloğu hedefin yerine taşır.
function duzenTasi(liste, id, hedefId) {
  const i = liste.findIndex((x) => x.id === id);
  const j = liste.findIndex((x) => x.id === hedefId);
  if (i < 0 || j < 0 || i === j) return liste;
  const yeni = [...liste];
  const [el] = yeni.splice(i, 1);
  yeni.splice(j, 0, el);
  return yeni;
}

// `bloklar`: [{ id, ad, icerik, genislik?, gizlenemez? }] — `icerik` bloğun JSX'i (form durumuna bağlı, her çizimde taze).
// `aralik`: bloklar arası boşluk (px).
function DuzenAlani({ ekran, bloklar, aralik = 12 }) {
  const baglam = React.useContext(EkranDuzeniBaglami);
  const kayitli = baglam && baglam.duzenler ? baglam.duzenler[ekran] : null;
  const [kip, setKip] = useState(false);
  const [taslak, setTaslak] = useState(null);
  const [suruklenen, setSuruklenen] = useState(null);
  // SALINIM KİLİDİ: takastan sonra bloklar yer değiştirdiği için işaretçi yeniden AYNI hedefin üstüne düşebiliyor ve
  // blok geri kaçıyordu (senaryo yakaladı). Son takas edilen hedef, işaretçi başka bir bloğa geçene kadar yok sayılır.
  const sonHedefRef = useRef(null);
  const duzen = kip && taslak ? taslak : ekranDuzeniCoz(bloklar, kayitli);
  const blokBul = (id) => (bloklar || []).find((b) => b.id === id);

  const kipeGir = () => { setTaslak(ekranDuzeniCoz(bloklar, kayitli)); setKip(true); };
  const kiptenCik = () => { setKip(false); setTaslak(null); setSuruklenen(null); };
  const guncelle = (id, degisim) => setTaslak((o) => (o || duzen).map((x) => (x.id === id ? { ...x, ...degisim } : x)));
  const kaydet = () => {
    if (baglam && baglam.kaydet) baglam.kaydet(ekran, taslak || duzen);
    kiptenCik();
  };

  // SÜRÜKLEME: tutamakta basılı tutulunca işaretçi yakalanır; hareket ederken altındaki bloğun yerine geçilir.
  const surukle = {
    onPointerDown: (id) => (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* */ } sonHedefRef.current = null; setSuruklenen(id); },
    onPointerMove: (e) => {
      if (!suruklenen) return;
      const alti = document.elementFromPoint(e.clientX, e.clientY);
      const blok = alti && alti.closest ? alti.closest(`[data-duzen-ekran="${ekran}"] [data-duzen-blok]`) : null;
      const hedef = blok && blok.getAttribute("data-duzen-blok");
      if (!hedef || hedef === suruklenen) { if (hedef === suruklenen) return; sonHedefRef.current = null; return; }
      if (hedef === sonHedefRef.current) return;
      sonHedefRef.current = hedef;
      setTaslak((o) => duzenTasi(o || duzen, suruklenen, hedef));
    },
    onPointerUp: () => setSuruklenen(null),
  };

  const cubuk = (d, i) => {
    const b = blokBul(d.id);
    return (
      <div data-duzen-cubugu={d.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "4px 6px", marginBottom: 6,
        background: "#6B4E8A14", border: "1px solid #6B4E8A55", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}>
        <span data-duzen-tutamak={d.id} title="Basılı tutup sürükleyin"
          onPointerDown={surukle.onPointerDown(d.id)} onPointerMove={surukle.onPointerMove} onPointerUp={surukle.onPointerUp} onPointerCancel={surukle.onPointerUp}
          style={{ cursor: "grab", touchAction: "none", display: "inline-flex", padding: 2, color: "var(--erp-purple)" }}>
          <GripVertical size={16} />
        </span>
        <b style={{ color: "var(--erp-purple)" }}>{b ? b.ad : d.id}</b>
        <span style={{ display: "inline-flex", gap: 2 }}>
          <button type="button" data-duzen-yukari={d.id} disabled={i === 0} onClick={() => setTaslak((o) => duzenTasi(o || duzen, d.id, duzen[i - 1].id))}
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 4px", cursor: "pointer", display: "inline-flex" }}><ChevronUp size={12} /></button>
          <button type="button" data-duzen-asagi={d.id} disabled={i === duzen.length - 1} onClick={() => setTaslak((o) => duzenTasi(o || duzen, d.id, duzen[i + 1].id))}
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 4px", cursor: "pointer", display: "inline-flex" }}><ChevronDown size={12} /></button>
        </span>
        <span style={{ display: "inline-flex", gap: 2, marginLeft: "auto" }}>
          {DUZEN_GENISLIKLERI.map((g) => (
            <button key={g.k} type="button" data-duzen-genislik={`${d.id}:${g.k}`} onClick={() => guncelle(d.id, { genislik: g.k })}
              style={{ padding: "1px 8px", fontSize: 11, fontWeight: 600, borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                border: `1.5px solid ${d.genislik === g.k ? "var(--erp-purple)" : "var(--erp-border)"}`,
                background: d.genislik === g.k ? "#6B4E8A1A" : "#fff", color: d.genislik === g.k ? "var(--erp-purple)" : "var(--erp-text-2)" }}>
              {g.ad}
            </button>
          ))}
        </span>
        {!(b && b.gizlenemez) && (
          <button type="button" data-duzen-gizle={d.id} onClick={() => guncelle(d.id, { gizli: !d.gizli })} title={d.gizli ? "Göster" : "Gizle"}
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 5px", cursor: "pointer", display: "inline-flex", color: d.gizli ? "var(--erp-text-3)" : "var(--erp-purple)" }}>
            {d.gizli ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    );
  };

  const genislikSinifi = (g) => `duzen-blok duzen-blok-${g || "tam"}`;
  return (
    <div data-duzen-ekran={ekran} data-duzen-kip={kip ? "1" : undefined}>
      {baglam && baglam.yetkili && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: kip ? 8 : 2 }}>
          {!kip ? (
            <button type="button" data-duzen-ac={ekran} onClick={kipeGir} title="Bu ekranın bloklarını sırala, genişliğini ayarla, gizle"
              style={{ border: "none", background: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--erp-text-3)", padding: 2 }}>
              <LayoutGrid size={12} /> Düzen
            </button>
          ) : (
            <>
              <span style={{ fontSize: 11, color: "var(--erp-purple)", marginRight: "auto" }}>
                Düzenleme kipi — blokları ⠿ ile sürükleyin ya da oklarla taşıyın; genişlik ve göz düğmesiyle ayarlayın. Bütün cihazlara kaydedilir.
              </span>
              <button type="button" className="btn-ghost" data-duzen-varsayilan={ekran} style={{ padding: "3px 10px", fontSize: 12 }}
                onClick={() => setTaslak(ekranDuzeniCoz(bloklar, null))}><RotateCcw size={12} /> Varsayılana dön</button>
              <button type="button" className="btn-ghost" data-duzen-vazgec={ekran} style={{ padding: "3px 10px", fontSize: 12 }} onClick={kiptenCik}><X size={12} /> Vazgeç</button>
              <button type="button" className="btn-primary btn-save" data-duzen-kaydet={ekran} style={{ padding: "3px 12px", fontSize: 12 }} onClick={kaydet}><Save size={12} /> Düzeni kaydet</button>
            </>
          )}
        </div>
      )}
      <div className="duzen-alani" style={{ gap: aralik }}>
        {duzen.map((d, i) => {
          const b = blokBul(d.id);
          if (!b) return null;
          if (d.gizli && !kip) return null;
          return (
            <div key={d.id} data-duzen-blok={d.id} data-duzen-genislik-deger={d.genislik} className={genislikSinifi(d.genislik)}
              style={kip ? { outline: `2px dashed ${suruklenen === d.id ? "var(--erp-purple)" : "#6B4E8A66"}`, outlineOffset: 3, borderRadius: 6, opacity: d.gizli ? 0.45 : 1 } : undefined}>
              {kip && cubuk(d, i)}
              {/* Kipte içerik tıklanamaz: blok taşınırken yanlışlıkla bir alana yazılmasın / düğmeye basılmasın. */}
              <div style={kip ? { pointerEvents: "none", maxHeight: d.gizli ? 60 : undefined, overflow: d.gizli ? "hidden" : undefined } : undefined}>
                {b.icerik}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
