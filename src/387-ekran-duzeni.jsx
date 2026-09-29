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

// SERBEST GENİŞLİK (v1.528.0 — kullanıcı: "boyutunu mouse ile ayarlayıp sürükleyeceğimiz; tek satıra sığacak çok şey
// varken birkaç satır tutuyor"). Üç hazır genişlik (⅓ ½ tam) yan yana dizmeye yetmiyordu: Not dar, para birimi yarım
// olunca satırın ¼'ü boş kalıyordu. Artık genişlik 12 sütunluk ızgarada 1–12 arası bir SAYI da olabilir; bloğun sağ
// kenarındaki tutamak fareyle/parmakla çekilerek ayarlanır. Hazır adlar (dar/yarim/tam) eski kayıtlar ve düğmeler için
// duruyor; çekerken 4/6/12'ye denk gelen değer yine adıyla yazılır (kayıt ve düğme vurgusu tutarlı kalsın).
const DUZEN_SUTUN = { dar: 4, yarim: 6, tam: 12 };
function duzenSutunu(g) {
  if (DUZEN_SUTUN[g]) return DUZEN_SUTUN[g];
  const n = Math.round(Number(g));
  return n >= 1 && n <= 12 ? n : 12;
}
function duzenGenislikDegeri(n) {
  const k = Object.keys(DUZEN_SUTUN).find((x) => DUZEN_SUTUN[x] === n);
  return k || n;
}

// Kodun blok listesi + kayıtlı düzen → çizilecek sıra. Saf; birim testli.
function ekranDuzeniCoz(bloklar, kayit) {
  const kodda = new Map((bloklar || []).map((b) => [b.id, b]));
  const sayiMi = (g) => typeof g === "number" && Number.isInteger(g) && g >= 1 && g <= 12;
  const gecerliGenislik = (g, v) => (DUZEN_GENISLIKLERI.some((x) => x.k === g) || sayiMi(g) ? g : (v || "tam"));
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
// `kilitli`: düzen ikonu çıkmaz (salt-okunur önizleme gibi yerler); kayıtlı düzen yine uygulanır.
// `acRef` + `disIkon` (v1.529.0): ikon ekranın kendi başlık şeridinde duruyorsa (sipariş kartı) alan kendi ikon satırını
// çizmez; başlıktaki ikon `acRef.current()` ile kipi açar. Kip araç çubuğu (Kaydet/Vazgeç) yine alanın üstünde çıkar.
function DuzenAlani({ ekran, bloklar, aralik = 12, kilitli = false, acRef, disIkon = false }) {
  const baglam = React.useContext(EkranDuzeniBaglami);
  const kayitli = baglam && baglam.duzenler ? baglam.duzenler[ekran] : null;
  const [kip, setKip] = useState(false);
  const [taslak, setTaslak] = useState(null);
  const [suruklenen, setSuruklenen] = useState(null);
  // SALINIM KİLİDİ: takastan sonra bloklar yer değiştirdiği için işaretçi yeniden AYNI hedefin üstüne düşebiliyor ve
  // blok geri kaçıyordu (senaryo yakaladı). Son takas edilen hedef, işaretçi başka bir bloğa geçene kadar yok sayılır.
  const sonHedefRef = useRef(null);
  // Boyutlandırma: { id, x, bas, kolon } — basılan anın işaretçi konumu, başlangıç sütunu, bir sütunun piksel genişliği.
  const boyutRef = useRef(null);
  const [boyutlanan, setBoyutlanan] = useState(null);
  const duzen = kip && taslak ? taslak : ekranDuzeniCoz(bloklar, kayitli);
  const blokBul = (id) => (bloklar || []).find((b) => b.id === id);

  const kipeGir = () => { setTaslak(ekranDuzeniCoz(bloklar, kayitli)); setKip(true); };
  if (acRef) acRef.current = kipeGir;
  const kiptenCik = () => { setKip(false); setTaslak(null); setSuruklenen(null); setBoyutlanan(null); boyutRef.current = null; };
  const guncelle = (id, degisim) => setTaslak((o) => (o || duzen).map((x) => (x.id === id ? { ...x, ...degisim } : x)));
  const kaydet = () => {
    if (baglam && baglam.kaydet) baglam.kaydet(ekran, taslak || duzen);
    kiptenCik();
  };

  // SÜRÜKLEME: tutamakta basılı tutulunca işaretçi yakalanır; hareket ederken altındaki bloğun yerine geçilir.
  const surukle = {
    // BÜTÜN ÇUBUK TUTAMAK (v1.528.0): yalnız küçük ⠿ ikonundan tutmak zordu. Çubuktaki düğmeler hariç her yer sürükler.
    onPointerDown: (id) => (e) => { if (e.target.closest && e.target.closest("button")) return; e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* */ } sonHedefRef.current = null; setSuruklenen(id); },
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

  // BOYUTLANDIRMA: sağ kenardaki tutamak çekildikçe genişlik en yakın sütuna oturur (ızgara dışı piksel yok — dar ekranda
  // yine tam genişliğe iner).
  const boyutla = {
    onPointerDown: (d) => (e) => {
      e.preventDefault(); e.stopPropagation();
      const alan = e.currentTarget.closest(".duzen-alani");
      if (!alan) return;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      const stil = getComputedStyle(alan);
      const bosluk = parseFloat(stil.columnGap) || 0;
      boyutRef.current = { id: d.id, x: e.clientX, bas: duzenSutunu(d.genislik), kolon: (alan.getBoundingClientRect().width + bosluk) / 12 };
      setBoyutlanan(d.id);
    },
    onPointerMove: (e) => {
      const b = boyutRef.current;
      if (!b || !b.kolon) return;
      const n = Math.max(1, Math.min(12, Math.round(b.bas + (e.clientX - b.x) / b.kolon)));
      setTaslak((o) => (o || duzen).map((x) => (x.id === b.id && duzenSutunu(x.genislik) !== n ? { ...x, genislik: duzenGenislikDegeri(n) } : x)));
    },
    onPointerUp: () => { boyutRef.current = null; setBoyutlanan(null); },
  };

  const cubuk = (d, i) => {
    const b = blokBul(d.id);
    return (
      <div data-duzen-cubugu={d.id} title="Basılı tutup sürükleyin"
        onPointerDown={surukle.onPointerDown(d.id)} onPointerMove={surukle.onPointerMove} onPointerUp={surukle.onPointerUp} onPointerCancel={surukle.onPointerUp}
        style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", padding: "1px 4px", marginBottom: 3, cursor: suruklenen === d.id ? "grabbing" : "grab", touchAction: "none",
        background: "#6B4E8A14", border: "1px solid #6B4E8A55", borderRadius: "var(--erp-r-sm)", fontSize: 11, userSelect: "none" }}>
        <span data-duzen-tutamak={d.id} style={{ display: "inline-flex", padding: 1, color: "var(--erp-purple)" }}>
          <GripVertical size={14} />
        </span>
        <b style={{ color: "var(--erp-purple)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{b ? b.ad : d.id}</b>
        <span data-duzen-sutun-etiketi={d.id} className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{duzenSutunu(d.genislik)}/12</span>
        <span style={{ display: "inline-flex", gap: 2 }}>
          <button type="button" data-duzen-yukari={d.id} disabled={i === 0} onClick={() => setTaslak((o) => duzenTasi(o || duzen, d.id, duzen[i - 1].id))}
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 4px", cursor: "pointer", display: "inline-flex" }}><ChevronUp size={12} /></button>
          <button type="button" data-duzen-asagi={d.id} disabled={i === duzen.length - 1} onClick={() => setTaslak((o) => duzenTasi(o || duzen, d.id, duzen[i + 1].id))}
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 4px", cursor: "pointer", display: "inline-flex" }}><ChevronDown size={12} /></button>
        </span>
        <span style={{ display: "inline-flex", gap: 2, marginLeft: "auto" }}>
          {DUZEN_GENISLIKLERI.map((g) => (
            <button key={g.k} type="button" data-duzen-genislik={`${d.id}:${g.k}`} onClick={() => guncelle(d.id, { genislik: g.k })}
              style={{ padding: "0 6px", fontSize: 10, fontWeight: 600, borderRadius: "var(--erp-r-pill)", cursor: "pointer",
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

  const genislikSinifi = (g) => `duzen-blok duzen-blok-${DUZEN_SUTUN[g] ? g : "sayi"}`;
  return (
    <div data-duzen-ekran={ekran} data-duzen-kip={kip ? "1" : undefined}>
      {baglam && baglam.yetkili && !kilitli && (kip || !disIkon) && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: kip ? 8 : 0, lineHeight: kip ? undefined : 0 }}>
          {!kip ? (
            // KÜÇÜK İKON (v1.525.0 — kullanıcı: "Düzen için küçük ayar tutuyorsun, onunla yapılsın; kapatma ve silme
            // butonu gibi o kadar büyük yer kaplamasın, her zaman yapılmayacak işlem"). v1.523.0'da görünmediği için
            // mor, yazılı bir düğmeye çevrilmişti; bu kez fazla göze battı. Kart başlıklarındaki sil/pasif ikonlarıyla
            // aynı `btn-ikon`: sessiz, üstüne gelince belirir; adı ipucunda. Tanımlar > Görünüm nerede olduğunu anlatıyor.
            <button type="button" className="btn-ikon" data-duzen-ac={ekran} onClick={kipeGir} title="Ekran düzeni — blokları sırala, genişliğini ayarla, gizle">
              <LayoutGrid size={14} />
            </button>
          ) : (
            <>
              <span style={{ fontSize: 11, color: "var(--erp-purple)", marginRight: "auto" }}>
                Düzenleme kipi — blokları mor çubuğundan tutup sürükleyin; genişliği sağ kenardaki tutamağı çekerek ayarlayın (yan yana sığanlar aynı satıra geçer). Bütün cihazlara kaydedilir.
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
              style={{ "--duzen-sutun": duzenSutunu(d.genislik),
                ...(kip ? { outline: `2px dashed ${suruklenen === d.id || boyutlanan === d.id ? "var(--erp-purple)" : "#6B4E8A66"}`, outlineOffset: 3, borderRadius: 6, opacity: d.gizli ? 0.45 : 1 } : {}) }}>
              {kip && cubuk(d, i)}
              {kip && (
                // SAĞ KENAR TUTAMAĞI: çekilerek genişlik (1–12 sütun). Dar ekranda bloklar zaten tam genişlik — gizli.
                <div data-duzen-boyut={d.id} className="duzen-boyut-tutamagi" title="Çekerek genişliği ayarlayın"
                  onPointerDown={boyutla.onPointerDown(d)} onPointerMove={boyutla.onPointerMove} onPointerUp={boyutla.onPointerUp} onPointerCancel={boyutla.onPointerUp}
                  style={{ position: "absolute", top: 0, bottom: 0, right: -8, width: 12, cursor: "ew-resize", touchAction: "none", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 4, height: 36, maxHeight: "60%", borderRadius: 2, background: boyutlanan === d.id ? "var(--erp-purple)" : "#6B4E8A88" }} />
                </div>
              )}
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

// TANIMLAR > GÖRÜNÜM > EKRAN DÜZENİ (v1.523.0 — kullanıcı: "Düzen tuşunu göremedim"). Düzenin NEREDE değiştirildiğini
// söyler ve kayıtlı düzenleri tek tek varsayılana döndürür (yanlış bir düzen kaydedilip form kullanılmaz hâle gelirse
// buradan kurtarılsın).
const DUZENLI_EKRANLAR = [
  { ekran: "siparisFormu", ad: "Sipariş formu", yer: "Sipariş / Alış Siparişi → Yeni sipariş ya da ✎ Düzenle" },
  { ekran: "fisFormu", ad: "Fiş formu", yer: "Cari kartı → Alış Fişi / Satış Fişi" },
  { ekran: "urunKartiSekmeleri", ad: "Ürün kartı — sekmeler", yer: "Stok → ürün kartı → üst şeritteki düzen ikonu" },
  { ekran: "urunKartiStok", ad: "Ürün kartı — Stok Bilgileri", yer: "Stok → ürün kartı → Stok Bilgileri sekmesi" },
  { ekran: "siparisKarti", ad: "Sipariş kartı", yer: "Sipariş / Alış Siparişi → siparişi tam ekran aç" },
  { ekran: "kasaDetay", ad: "Kasa", yer: "Finans → Kasa & Banka → Kasa → bir kasa seçin → şeritteki düzen ikonu" },
  { ekran: "bankaDetay", ad: "Banka hesabı", yer: "Finans → Kasa & Banka → Banka → bir hesap seçin → şeritteki düzen ikonu" },
  { ekran: "cariHareketler", ad: "Cari kartı — Hareketler", yer: "Cari → cari kartı → üst şeritteki düzen ikonu (Hareketler sekmesindeyken)" },
];
function EkranDuzeniTanimlari() {
  const baglam = React.useContext(EkranDuzeniBaglami);
  const duzenler = (baglam && baglam.duzenler) || {};
  return (
    <div data-ekran-duzeni-tanimlari="1">
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Ekran Düzeni</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
        Aşağıdaki ekranlarda sağ üstteki küçük <b>düzen ikonuyla</b> (<LayoutGrid size={12} style={{ verticalAlign: "-2px" }} />) bloklar
        sürüklenip sıralanır, genişliği (Dar / Yarım / Tam) seçilir, gizlenir. Düzen bütün cihazlarda geçerlidir.
      </p>
      {DUZENLI_EKRANLAR.map((x) => {
        const kayitli = Array.isArray(duzenler[x.ekran]) && duzenler[x.ekran].length > 0;
        return (
          <div key={x.ekran} data-ekran-duzeni-satiri={x.ekran} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderBottom: "1px solid var(--erp-line-soft)" }}>
            <div style={{ minWidth: 150 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{x.ad}</div>
              <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{x.yer}</div>
            </div>
            <span style={{ fontSize: 12, color: kayitli ? "var(--erp-purple)" : "var(--erp-text-3)" }}>{kayitli ? "özel düzen kayıtlı" : "varsayılan düzen"}</span>
            {kayitli && baglam && baglam.yetkili && (
              <button type="button" className="btn-ghost" data-ekran-duzeni-sifirla={x.ekran} style={{ padding: "3px 10px", fontSize: 12, marginLeft: "auto" }}
                onClick={() => baglam.kaydet(x.ekran, [])}>
                <RotateCcw size={12} /> Varsayılana dön
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// SIRALANABİLİR SEKMELER (v1.524.0 — kullanıcı: "Ürün kartına da düzen ekle"). Ürün kartı sekmeli: bloklardan önce
// SEKMELERİN kendisi düzenlenmek istenir (en çok kullanılan öne, hiç kullanılmayan gizli). Aynı kayıt biçimi
// (`ekranDuzenleri[ekran] = [{ id, gizli }]`) ve aynı çözücü (`ekranDuzeniCoz`); yalnız yerleşim yatay.
// `sekmeler`: [{ key, label, gizlenemez? }] — koşullu sekmeler (Reçete yalnız mamulde) listede olmayabilir.
// `acRef` + `disIkon` (v1.530.0): DuzenAlani'daki gibi — ikon kartın üst şeridinde.
function DuzenliSekmeler({ ekran, sekmeler, aktif, onSec, acRef, disIkon = false }) {
  const baglam = React.useContext(EkranDuzeniBaglami);
  const kayitli = baglam && baglam.duzenler ? baglam.duzenler[ekran] : null;
  const bloklar = (sekmeler || []).map((t) => ({ id: t.key, gizlenemez: !!t.gizlenemez }));
  const [kip, setKip] = useState(false);
  const [taslak, setTaslak] = useState(null);
  const [suruklenen, setSuruklenen] = useState(null);
  const sonHedefRef = useRef(null);
  const duzen = kip && taslak ? taslak : ekranDuzeniCoz(bloklar, kayitli);
  const sekmeBul = (id) => (sekmeler || []).find((t) => t.key === id);
  const gorunenler = duzen.filter((d) => !d.gizli);
  // Açık sekme gizlendiyse ilk görünen sekmeye geç (kart boş kalmasın).
  const aktifGizli = !kip && aktif && !gorunenler.some((d) => d.id === aktif) && duzen.some((d) => d.id === aktif);
  useEffect(() => { if (aktifGizli && gorunenler[0]) onSec(gorunenler[0].id); }, [aktifGizli]);

  const kiptenCik = () => { setKip(false); setTaslak(null); setSuruklenen(null); };
  if (acRef) acRef.current = () => { setTaslak(ekranDuzeniCoz(bloklar, kayitli)); setKip(true); };
  const kaydet = () => {
    const liste = taslak || duzen;
    // BU ÜRÜNDE OLMAYAN sekmelerin kaydı korunur: hammadde kartında kaydedilen sıra Reçete/Maliyet'i silmesin.
    // Eski kayıttaki SOLUNDAKİ sekmenin hemen sağına geri konur (sona atılsaydı mamulde Reçete en sona kaçardı).
    const burada = new Set(liste.map((x) => x.id));
    const sonuc = [...liste];
    const eski = (Array.isArray(kayitli) ? kayitli : []).filter((k) => k && k.id);
    eski.forEach((k, i) => {
      if (burada.has(k.id)) return;
      const sol = i > 0 ? sonuc.findIndex((x) => x.id === eski[i - 1].id) : -1;
      sonuc.splice(sol + 1, 0, k);
    });
    if (baglam && baglam.kaydet) baglam.kaydet(ekran, sonuc);
    kiptenCik();
  };
  const tasi = (id, hedefId) => setTaslak((o) => duzenTasi(o || duzen, id, hedefId));
  const surukle = {
    onPointerDown: (id) => (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* */ } sonHedefRef.current = null; setSuruklenen(id); },
    onPointerMove: (e) => {
      if (!suruklenen) return;
      const alti = document.elementFromPoint(e.clientX, e.clientY);
      const el = alti && alti.closest ? alti.closest(`[data-sekme-duzen-ekran="${ekran}"] [data-sekme-duzen]`) : null;
      const hedef = el && el.getAttribute("data-sekme-duzen");
      if (!hedef || hedef === suruklenen) { if (!hedef) sonHedefRef.current = null; return; }
      if (hedef === sonHedefRef.current) return;
      sonHedefRef.current = hedef;
      tasi(suruklenen, hedef);
    },
    onPointerUp: () => setSuruklenen(null),
  };
  const kucukDugme = { border: "1px solid var(--erp-line)", background: "#fff", borderRadius: 4, padding: "1px 4px", cursor: "pointer", display: "inline-flex" };

  if (kip) {
    return (
      <div data-sekme-duzen-ekran={ekran} data-duzen-kip="1" style={{ marginBottom: 14, padding: 8, border: "2px dashed #6B4E8A66", borderRadius: "var(--erp-r-md)", background: "#6B4E8A0A" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "var(--erp-purple)", marginRight: "auto" }}>
            Sekme düzeni — ⠿ ile sürükleyin ya da oklarla taşıyın; göz düğmesiyle gizleyin. Bütün ürün kartlarında ve cihazlarda geçerli.
          </span>
          <button type="button" className="btn-ghost" data-duzen-varsayilan={ekran} style={{ padding: "3px 10px", fontSize: 12 }}
            onClick={() => setTaslak(ekranDuzeniCoz(bloklar, null))}><RotateCcw size={12} /> Varsayılana dön</button>
          <button type="button" className="btn-ghost" data-duzen-vazgec={ekran} style={{ padding: "3px 10px", fontSize: 12 }} onClick={kiptenCik}><X size={12} /> Vazgeç</button>
          <button type="button" className="btn-primary btn-save" data-duzen-kaydet={ekran} style={{ padding: "3px 12px", fontSize: 12 }} onClick={kaydet}><Save size={12} /> Düzeni kaydet</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {duzen.map((d, i) => {
            const t = sekmeBul(d.id);
            if (!t) return null;
            return (
              <div key={d.id} data-sekme-duzen={d.id} data-sekme-gizli={d.gizli ? "1" : undefined}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${suruklenen === d.id ? "var(--erp-purple)" : "#6B4E8A55"}`, background: "#fff", opacity: d.gizli ? 0.45 : 1 }}>
                <span data-duzen-tutamak={d.id} title="Basılı tutup sürükleyin"
                  onPointerDown={surukle.onPointerDown(d.id)} onPointerMove={surukle.onPointerMove} onPointerUp={surukle.onPointerUp} onPointerCancel={surukle.onPointerUp}
                  style={{ cursor: "grab", touchAction: "none", display: "inline-flex", color: "var(--erp-purple)" }}>
                  <GripVertical size={14} />
                </span>
                <span style={{ textDecoration: d.gizli ? "line-through" : undefined }}>{t.label}</span>
                <button type="button" data-duzen-yukari={d.id} title="Sola" disabled={i === 0} onClick={() => tasi(d.id, duzen[i - 1].id)} style={kucukDugme}><ChevronLeft size={12} /></button>
                <button type="button" data-duzen-asagi={d.id} title="Sağa" disabled={i === duzen.length - 1} onClick={() => tasi(d.id, duzen[i + 1].id)} style={kucukDugme}><ChevronRight size={12} /></button>
                {!t.gizlenemez && (
                  <button type="button" data-duzen-gizle={d.id} title={d.gizli ? "Göster" : "Gizle"}
                    onClick={() => setTaslak((o) => (o || duzen).map((x) => (x.id === d.id ? { ...x, gizli: !x.gizli } : x)))}
                    style={{ ...kucukDugme, color: d.gizli ? "var(--erp-text-3)" : "var(--erp-purple)" }}>
                    {d.gizli ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div data-sekme-duzen-ekran={ekran} style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      {gorunenler.map((d) => {
        const t = sekmeBul(d.id);
        if (!t) return null;
        return (
          <button key={t.key} type="button" data-kart-sekme={t.key} onClick={() => onSec(t.key)}
            style={{
              padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              border: `1.5px solid ${aktif === t.key ? "var(--erp-orange)" : "var(--erp-border)"}`,
              background: aktif === t.key ? "var(--erp-orange-bg)" : "#fff",
            }}>
            {t.label}
          </button>
        );
      })}
      {baglam && baglam.yetkili && !disIkon && (
        <button type="button" className="btn-ikon" data-duzen-ac={ekran} onClick={() => { setTaslak(ekranDuzeniCoz(bloklar, kayitli)); setKip(true); }}
          title="Sekme düzeni — sırasını değiştir, kullanılmayanları gizle" style={{ marginLeft: "auto" }}>
          <LayoutGrid size={14} />
        </button>
      )}
    </div>
  );
}
