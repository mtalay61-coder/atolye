// `genislik`: alanın kendi genişliği (18 Eylül). Esnek ızgaralarda alanlar ekranı doldurmak için
// uzuyor ve aralarında okunmayan boşluk kalıyordu; bu prop verilen alan içeriği kadar duruyor.
function Field({ label, children, genislik }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600,
      width: genislik, flex: genislik ? "0 0 auto" : undefined }}>
      {label}
      {children}
    </label>
  );
}

// KAYIT ŞERİDİ (v1.625.0 — kullanıcı: "Sipariş düzenleyip kaydet tuşu mor şeride alalım", "Tüm kaydetler üst mor
// şeritte olsun"). Kartlarda (sipariş, cari, ürün) üstteki mor şerit kaydın kimliği + eylemleri taşıyor; formlar da aynı
// düzende: solda formun adı (ve isteğe bağlı özet), sağda Kaydet · Vazgeç. Kaydet hep aynı yerde — kalem girişindeki
// yeşil "Ekle"den ve formun dibinden uzak. `yapiskan`: uzun formda (sipariş, fiş) şerit kaydırınca üstte kalır.
// `veri`: testlerin şeridi bulması için data özniteliği adı.
const MOR_SERIT_STIL = { background: "#EDE7F2", border: "1px solid #C9B3D9", borderRadius: "var(--erp-r-md)" };
function KayitSeridi({ baslik, ikon, ozet, children, yapiskan = false, veri = "data-kayit-seridi", style }) {
  return (
    <div {...{ [veri]: "1" }} data-kayit-seridi-ortak="1"
      style={{ ...MOR_SERIT_STIL, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "7px 10px", marginBottom: 12,
        ...(yapiskan ? { position: "sticky", top: 0, zIndex: 5, boxShadow: "0 2px 6px rgba(60,40,80,.08)" } : {}), ...(style || {}) }}>
      {ikon}
      {baslik && <span style={{ fontSize: 14, fontWeight: 700, color: "#5B3F75" }}>{baslik}</span>}
      {ozet}
      <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {children}
      </span>
    </div>
  );
}

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "var(--erp-r-md)",
  border: "1px solid var(--erp-line)",
  background: "#fff",
  fontSize: 14,
  width: "100%",
};

// `mesaj` da kabul: üç yerde (ürün kartı, mamul depo, paketleme) bu adla çağrılıyordu ve kutu
// boş çıkıyordu (14 Eylül denetimi).
function EmptyState({ text, mesaj }) {
  text = text || mesaj;
  return (
    <div style={{
      textAlign: "center", padding: "48px 20px", color: "var(--erp-text-3)", border: "1px dashed var(--erp-line)",
      borderRadius: "var(--erp-r-md)", fontSize: 14,
    }}>
      {text}
    </div>
  );
}


// ÇEVRİMDIŞI KİLİT EKRANI (v1.556.1) — App'teki `kilitli` iken her şeyin üstünde; altındaki ekrana dokunulamaz.
// Kullanıcıya NEDEN durdurulduğu ve ne olacağı söylenir: veri kaybolmasın diye; bağlantı gelince kendiliğinden devam.
function CevrimdisiKilit({ yerelAcildi, bekleyenSayisi, sebep, onDene }) {
  const [deneniyor, setDeneniyor] = useState(false);
  // KLAVYE DE KİLİTLİ (v1.568.0, denetim): katman yalnız fareyi kesiyordu. Bağlantı koptuğu an imleç bir form kutusundaysa
  // yazmak, Enter, barkod okuyucu ve Ctrl+S kısayolu (pencere dinleyicisi) çalışmaya devam ediyordu — internetsiz kayıt.
  // Odak bırakılır; kilit açıkken katman dışındaki her tuş yakalama evresinde yutulur.
  useEffect(() => {
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* yok */ }
    const yut = (e) => {
      const katman = document.querySelector("[data-cevrimdisi-kilit]");
      if (katman && katman.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation();
    };
    window.addEventListener("keydown", yut, true);
    window.addEventListener("keypress", yut, true);
    window.addEventListener("submit", yut, true);
    return () => { window.removeEventListener("keydown", yut, true); window.removeEventListener("keypress", yut, true); window.removeEventListener("submit", yut, true); };
  }, []);
  return (
    <div data-cevrimdisi-kilit="1" role="alertdialog" aria-modal="true"
      onKeyDownCapture={(e) => { e.stopPropagation(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(34,27,20,.78)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", padding: "22px 24px", maxWidth: 460, width: "100%", textAlign: "center",
        boxShadow: "0 10px 40px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>📡</div>
        <div style={{ fontSize: 18, fontWeight: 800, margin: "10px 0 6px" }}>İnternet bağlantısı yok</div>
        <div style={{ fontSize: 13, color: "var(--erp-text-2)", lineHeight: 1.6 }}>
          Veri kaybolmasın diye uygulama durduruldu — internetsiz girilen kayıtlar buluta gitmeyip kaybolabiliyordu.
          {yerelAcildi
            ? " Uygulama buluta ulaşamadan açıldı; bağlantı gelince buluttaki güncel hâliyle kendiliğinden yeniden açılacak."
            : " Bağlantı gelince kaldığınız yerden kendiliğinden devam edecek."}
        </div>
        {bekleyenSayisi > 0 && (
          <div data-kilit-bekleyen={bekleyenSayisi} style={{ fontSize: 12, marginTop: 10, color: "var(--erp-warn)", fontWeight: 700 }}>
            {bekleyenSayisi} tablodaki kayıtlar bu cihazda bekliyor — bağlantı gelince otomatik gönderilecek.
          </div>
        )}
        {sebep && <div className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 8 }}>{String(sebep).slice(0, 120)}</div>}
        <button type="button" className="btn-primary" data-kilit-dene="1" disabled={deneniyor}
          onClick={async () => { setDeneniyor(true); try { await onDene(); } finally { setDeneniyor(false); } }}
          style={{ marginTop: 16, padding: "9px 18px", fontSize: 14 }}>
          {deneniyor ? "Deneniyor…" : "Bağlantıyı yeniden dene"}
        </button>
      </div>
    </div>
  );
}

// GİZLİ MODÜL DONDURUCU (v1.633.0 — kullanıcı: "uygulama doldukça yavaşlama başladı gibi, menüler geç
// açılıyor"). Modüller state'leri kaybolmasın diye hep mount'lu, yalnız `display:none` ile gizli (bkz. 100-app).
// Ama App her çizildiğinde (sekme değişimi, menü açma, bir kayıt) GİZLİ on küsur modül de baştan çiziliyordu:
// büyük veriyle bir menü açmak saniyeler sürüyordu — profilde zamanın çoğu ekranda görünmeyen Fişler,
// Paketleme, Cari listelerindeydi. Gizli kaldığı sürece güncelleme ATLANIYOR; görünür olduğu çizimde
// en güncel prop'larla yeniden çiziliyor (gizliyken kaçırdığı değişiklikler o an gelir). Modülün kendi
// state'i ve context aboneliği etkilenmez — yalnız App'ten gelen yeniden çizim durdurulur.
const GizliModul = React.memo(
  function GizliModul({ aktif, children }) {
    return <div style={{ display: aktif ? undefined : "none" }}>{children}</div>;
  },
  // true = "değişmedi, çizme": önce de gizliydi, şimdi de gizli.
  (onceki, sonraki) => !onceki.aktif && !sonraki.aktif
);

// ARAMA KUTUSUNDA × (v1.634.1 — kullanıcı, Fişler ekran görüntüsüyle: "aramada × da çıksın hızlı silme için").
// Stok aramasında v1.596.0'dan beri vardı; diğer modül aramaları (Fişler, Cari, Sipariş, Üretim…) aynı düğmeyi bu
// bileşenden alıyor. Kap `position: relative` olmalı (arama ikonunun durduğu kap zaten öyle). Boşken çizilmez.
function AramaTemizle({ deger, onTemizle, veri }) {
  if (!deger) return null;
  return (
    <button type="button" data-arama-temizle={veri || "1"} title="Aramayı temizle" onClick={onTemizle}
      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "none",
        cursor: "pointer", color: "var(--erp-text-3)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
  );
}

// SAĞ TIK + UZUN BASMA (v1.636.0 — kullanıcı: "sol tıklama olsun, ekranda gizlemek istediğimiz menüler özellikler sağ
// tıklama ile yapalım"; önce sipariş kartı ve listesi, gizlenen düğmeler HEP gizli). Masaüstünde sağ tık, tablette/telefonda
// sağ tık olmadığı için UZUN BASMA (550 ms, parmak kaymadan) aynı menüyü açar. Sol tık davranışı değişmez.
// Kullanım: <div {...sagTikIsleyicileri((x, y) => menuyuAc(x, y))}> — `etkin` false ise hiçbir işleyici eklenmez
// (tarayıcının kendi sağ tık menüsü kalır).
// KARTIN HER YERİ (v1.636.1 — kullanıcı: "sağ tık ekranın her yerinde çalışsın"). İşleyiciler artık yalnız başlık
// şeridinde değil, kartın TAMAMINDA (ürün, cari, üretim, sipariş kartı). İstisna: yazı kutusu / seçim kutusu ve
// seçili metin — orada tarayıcının kendi menüsü (kopyala/yapıştır) kalır; kartın menüsü onu yutmasın. İç içe kartta
// en içteki işleyici `stopPropagation` ile kazanır.
function yerelMenuKalsin(e) {
  const t = e && e.target;
  if (t && t.closest && t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
  try { const s = window.getSelection && window.getSelection(); if (s && !s.isCollapsed && String(s).trim()) return true; } catch (er) { /* yoksay */ }
  return false;
}
function sagTikIsleyicileri(ac, etkin = true) {
  if (!etkin || !ac) return {};
  let zamanlayici = null;
  let baslangic = null;
  const iptal = () => { if (zamanlayici) clearTimeout(zamanlayici); zamanlayici = null; };
  return {
    onContextMenu: (e) => { if (yerelMenuKalsin(e)) return; e.preventDefault(); e.stopPropagation(); ac(e.clientX, e.clientY); },
    onTouchStart: (e) => {
      const t = e.touches && e.touches[0]; if (!t || yerelMenuKalsin(e)) return;
      baslangic = { x: t.clientX, y: t.clientY };
      iptal();
      zamanlayici = setTimeout(() => { zamanlayici = null; ac(baslangic.x, baslangic.y); }, 550);
    },
    onTouchMove: (e) => {
      const t = e.touches && e.touches[0];
      if (t && baslangic && Math.hypot(t.clientX - baslangic.x, t.clientY - baslangic.y) > 10) iptal();
    },
    onTouchEnd: iptal,
    onTouchCancel: iptal,
  };
}

// SAYFA ÖLÇEĞİ (v1.636.0). Boyut ayarı `html { zoom }` ile uygulanıyor (386); `getBoundingClientRect`/`clientX` görünen
// (büyütülmüş) pikseli verir ama `position: fixed` öğenin left/top değeri yeniden zoom'la çarpılır. Bölmeden konumlanan
// açılır pencere ölçek kadar sağa-aşağı kayıyordu (kullanıcı: "reçete renk eşleştirmesinde renk seçimi sağ alta kayıyor").
// Konumlandırmadan ÖNCE koordinatlar buna bölünür.
function sayfaOlcegi() {
  try { return parseFloat(getComputedStyle(document.documentElement).zoom) || 1; } catch (e) { return 1; }
}

// YATAY KAYDIRMA KUTUSU (v1.636.0 — kullanıcı: "ekranın en sağındaki renk eşleşmelerini eşleyemiyorum, hiç görünmüyor").
// Geniş reçete matrisi kendi kutusunda yatay kayıyordu ama ince kaydırma çubuğu tablonun altında fark edilmiyor, farede
// yatay tekerlek de yok. Taşma varken iki yanda ◀ ▶ düğmesi (kutunun 3/4'ü kadar kaydırır) ve kalın çubuk (`.yatay-kutu`).
// Taşma yoksa düğme çizilmez. Boyut değişimini ResizeObserver izler.
function YatayKaydirma({ children, style, veri }) {
  const ref = React.useRef(null);
  const [d, setD] = useState({ sol: false, sag: false });
  const olc = useCallback(() => {
    const k = ref.current; if (!k) return;
    const sol = k.scrollLeft > 2, sag = k.scrollLeft + k.clientWidth < k.scrollWidth - 2;
    setD((o) => (o.sol === sol && o.sag === sag ? o : { sol, sag }));
  }, []);
  useEffect(() => {
    const k = ref.current; if (!k) return undefined;
    olc();
    const g = typeof ResizeObserver !== "undefined" ? new ResizeObserver(olc) : null;
    if (g) { g.observe(k); if (k.firstElementChild) g.observe(k.firstElementChild); }
    return () => { if (g) g.disconnect(); };
  }, [olc]);
  const kaydir = (yon) => { const k = ref.current; if (k) k.scrollBy({ left: yon * Math.max(120, k.clientWidth * 0.75), behavior: "smooth" }); };
  const dugme = (yon) => (
    <button type="button" data-yatay-kaydir={yon > 0 ? "sag" : "sol"} onClick={() => kaydir(yon)}
      title={yon > 0 ? "Sağdaki sütunlar" : "Soldaki sütunlar"}
      style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [yon > 0 ? "right" : "left"]: 2, zIndex: 3,
        width: 28, height: 44, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "rgba(255,255,255,.95)",
        boxShadow: "0 2px 8px rgba(34,27,20,.18)", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--erp-text)" }}>
      {yon > 0 ? "▶" : "◀"}
    </button>
  );
  return (
    <div style={{ position: "relative", maxWidth: "100%", ...(style || {}) }} data-yatay-kutu={veri || "1"}>
      <div ref={ref} className="yatay-kutu" onScroll={olc} style={{ overflowX: "auto", maxWidth: "100%" }}>{children}</div>
      {d.sol && dugme(-1)}
      {d.sag && dugme(1)}
    </div>
  );
}

// ORTAK SAĞ TIK MENÜSÜ (v1.636.0 — kullanıcı: "sağ mantığını her yer için yapalım"). Sipariş kartındaki menünün genel
// hâli: `konum` ({x, y} görünen piksel, sağ tıktan) verilince açılır; `ogeler` listesinden çizilir:
//   { k, etiket, ikon (lucide bileşeni), renk, onClick, gizli, pasif, baslik, veri } — `ayrac: true` ayraç çizer.
// `veri`: öğeye eklenecek data- öznitelikleri (eski düğmenin işareti korunsun diye, ör. { "data-fis-fatura": no }).
// Konum sayfa ölçeğine bölünür (zoom, bkz. sayfaOlcegi) ve ekrandan taşmaz. Dışına tıklamak / sağ tıklamak / Esc kapatır.
// Seçilen öğe önce menüyü kapatır sonra işini yapar (onay pencereleri menünün altında kalmasın).
// İşaretler: menü `data-sag-tik-menusu={veri}`, öğe `data-sag-tik={k}` — testler buradan tıklar.
function SagTikMenusu({ konum, baslik, ogeler, onKapat, veri, genislik = 240 }) {
  useEffect(() => {
    if (!konum) return undefined;
    const tus = (e) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [konum, onKapat]);
  if (!konum) return null;
  const gorunen = (ogeler || []).filter((o) => o && !o.gizli);
  // Arka arkaya / başta / sonda kalan ayraçlar atılır.
  const temiz = gorunen.filter((o, i) => !o.ayrac || (i > 0 && i < gorunen.length - 1 && !gorunen[i - 1].ayrac));
  const o = sayfaOlcegi();
  const W = window.innerWidth / o, H = window.innerHeight / o;
  const yukseklik = 34 + temiz.reduce((t, x) => t + (x.ayrac ? 5 : 35), 0);
  const x = Math.max(8, Math.min(konum.x / o, W - genislik - 8));
  const y = Math.max(8, Math.min(konum.y / o, H - yukseklik - 8));
  const ogeStil = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 13 };
  return createPortal(
    <div data-sag-tik-perde="1" onClick={onKapat} onContextMenu={(e) => { e.preventDefault(); onKapat(); }}
      style={{ position: "fixed", inset: 0, zIndex: 3500 }}>
      <div data-sag-tik-menusu={veri || "1"} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ position: "fixed", left: x, top: y, width: genislik, maxHeight: H - 16, overflowY: "auto", background: "#fff", border: "1px solid var(--erp-line)",
          borderRadius: "var(--erp-r-md)", boxShadow: "0 6px 20px rgba(34,27,20,.18)" }}>
        {baslik && (
          <div className="mono" style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".05em", color: "var(--erp-text-3)", padding: "6px 12px 4px", borderBottom: "1px solid var(--erp-line-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {baslik}
          </div>
        )}
        {temiz.map((og, i) => og.ayrac ? (
          <div key={`a${i}`} style={{ height: 1, background: "var(--erp-line-soft)", margin: "2px 0" }} />
        ) : (
          <button key={og.k} type="button" data-sag-tik={og.k} disabled={!!og.pasif} title={og.baslik || undefined} {...(og.veri || {})}
            style={{ ...ogeStil, color: og.pasif ? "var(--erp-text-3)" : (og.renk || "var(--erp-text)"), cursor: og.pasif ? "not-allowed" : "pointer" }}
            onClick={() => { if (og.pasif) return; onKapat(); og.onClick && og.onClick(); }}>
            {og.ikon ? React.createElement(og.ikon, { size: 15 }) : <span style={{ width: 15 }} />} {og.etiket}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
