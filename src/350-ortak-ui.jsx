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
