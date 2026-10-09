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
