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
