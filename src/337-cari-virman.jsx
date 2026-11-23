// ================= CARİ VİRMANI (v1.744.35) =================
//
// Kullanıcı (23 Kasım): "virmanı cari içerisinden yapalım, [Kasa & Banka'dan] kaldıralım … ödeme tahsilat var, ödemeden
// tıklayınca virman olacak; karşı cari seçilip ilk seçilen cariye ödeme yapmış gibi, tahsilat yapınca ilk seçilen cariye
// tahsilat yapmış gibi." Finans › Ödeme & Tahsilat'ta ödeme şekli "Virman": kasa / banka yok, para el değiştirmiyor; bir
// carinin bakiyesi ötekine aktarılır (mahsup).
//
//   Ödeme  + Virman: ilk cariye ÖDEME (Borç), karşı cariden TAHSİLAT (Alacak) — "karşı cari bizim yerimize ödedi"
//   Tahsilat + Virman: ilk cariden TAHSİLAT (Alacak), karşı cariye ÖDEME (Borç) — "ilk cari bizim yerimize karşıya ödedi"
//
// İki satır TEK sunucu fişinde (CVR-…, 078 `paraFisiYuku` `ekCariler`): biri yazılıp öteki düşemez; fiş iptali ikisini birden
// kaldırır. Satırlar sıradan tahsilat / ödeme satırı (`islemTipi`), ödeme şekli "Virman" — ekstre, son tahsilat ve ödemeler
// listesi ve raporlar onları ayrı kural yazmadan tanır. İki satır aynı tutar ve aynı para biriminde (kur yok: para hareket
// etmiyor; carinin bakiyesi para birimi bazında tutulur).
const CARI_VIRMAN_TURU = "Cari virmanı";

// Saf: iki carinin hareket satırları. Döner: { ilk, karsi } — ikisi de 035 cari hareketi biçiminde (fiş no'yu kapı verir).
function cariVirmanHareketleri({ tip, ilkCari, karsiCari, tarih, tutar, paraBirimi, defter, aciklama }) {
  const ilkTip = tip === "Tahsilat" ? "Tahsilat" : "Ödeme";
  const karsiTip = ilkTip === "Ödeme" ? "Tahsilat" : "Ödeme";
  const ek = String(aciklama || "").trim();
  const satir = (islemTipi, karsi) => ({
    tarih, yon: hareketYonu(islemTipi), tutar, paraBirimi: paraBirimi || "TRY", odemeSekli: "Virman", vade: "",
    islemTipi, defter: defter || "Genel", virmanKarsiCariId: karsi.id,
    aciklama: `Virman (${islemTipi === "Ödeme" ? "ödeme" : "tahsilat"}) — karşı: ${karsi.unvan}${ek ? `: ${ek}` : ""}`,
  });
  return { ilk: satir(ilkTip, karsiCari), karsi: satir(karsiTip, ilkCari) };
}

// props: tip ("Tahsilat" | "Ödeme"), cari (ilk seçilen), cariler, showToast,
//        onKaydet({ karsiCariId, ilk, karsi }) → true (kaydedildi) | false (yazılamadı, form dolu kalır)
function CariVirmanSatiri({ tip, cari, cariler, showToast, onKaydet }) {
  const [form, setForm] = useState(() => ({ karsiCariId: "", tarih: bugunYerel(), tutar: "", paraBirimi: cari.paraBirimi || "TRY", defter: "Genel", aciklama: "" }));
  const kaydediliyorRef = useRef(false);
  const karsiCari = (cariler || []).find((c) => c.id === form.karsiCariId) || null;
  const t = parseFloat(form.tutar);
  const renk = "var(--erp-info)";

  async function kaydet() {
    if (kaydediliyorRef.current) return;
    if (!karsiCari) { showToast("Karşı cariyi seçin"); return; }
    if (karsiCari.id === cari.id) { showToast("Karşı cari ilk cariyle aynı olamaz"); return; }
    if (!(t > 0)) { showToast("Tutar girin"); return; }
    const { ilk, karsi } = cariVirmanHareketleri({ tip, ilkCari: cari, karsiCari, tarih: form.tarih, tutar: t,
      paraBirimi: form.paraBirimi, defter: form.defter, aciklama: form.aciklama });
    kaydediliyorRef.current = true;
    let ok = false;
    try { ok = await onKaydet({ karsiCariId: karsiCari.id, ilk, karsi }); }
    finally { kaydediliyorRef.current = false; }
    if (ok) setForm((f) => ({ ...f, karsiCariId: "", tutar: "", aciklama: "" }));
  }

  const ozet = karsiCari && t > 0
    ? (tip === "Ödeme"
      ? `${cari.unvan}: ödeme (borç) · ${karsiCari.unvan}: tahsilat (alacak)`
      : `${cari.unvan}: tahsilat (alacak) · ${karsiCari.unvan}: ödeme (borç)`)
    : null;
  return (
    <div data-cari-virman={tip} style={{ background: "#fff", border: `1.5px solid ${renk}`, borderRadius: "var(--erp-r-md)", padding: 12 }}>
      <div style={{ ...MOR_SERIT_STIL, display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap", padding: "6px 10px" }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(HAREKET_TIPI_RENK[tip] || renk, "22"), color: HAREKET_TIPI_RENK[tip] || renk, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <HareketIkonu tip="Virman" size={13} />{tip} · Virman
        </span>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{cari.unvan}</span>
        <span style={{ marginLeft: "auto" }}>
          <button type="button" className="btn-primary btn-save" data-cari-virman-kaydet="1" onClick={kaydet}><Save size={14} /> Kaydet</button>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Field label={tip === "Ödeme" ? "Karşı cari (ödemeyi yapan)" : "Karşı cari (ödenen)"}>
          <CariSecici cariler={(cariler || []).filter((c) => c.id !== cari.id && !c.pasif)} deger={form.karsiCariId} veriAdi="data-cari-virman-karsi"
            placeholder="Karşı cariyi ara…" onDegis={(id) => setForm((f) => ({ ...f, karsiCariId: id || "" }))} />
        </Field>
        <Field label="Tarih">
          <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Tutar">
          <div style={{ display: "flex", gap: 4 }}>
            <input type="number" step="0.01" min="0" data-cari-virman-tutar="1" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <select data-cari-virman-pb="1" value={form.paraBirimi} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })} style={{ ...inputStyle, width: 68 }}>
              {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Defter">
          <select value={form.defter} onChange={(e) => setForm({ ...form, defter: e.target.value })} style={inputStyle}>
            <option value="Genel">Genel</option>
            <option value="Resmi">Resmi</option>
            <option value="Muhasebe">Muhasebe (ikisine de)</option>
          </select>
        </Field>
        <Field label="Açıklama">
          <input value={form.aciklama} data-cari-virman-aciklama="1" placeholder="Opsiyonel" onChange={(e) => setForm({ ...form, aciklama: e.target.value })} style={inputStyle} />
        </Field>
      </div>
      {ozet && <div data-cari-virman-ozet="1" style={{ fontSize: 12, color: "var(--erp-text-2)", marginTop: 8 }}>Kaydedilince: {ozet} — tek fişte, kasa / banka hareketi yok.</div>}
    </div>
  );
}
