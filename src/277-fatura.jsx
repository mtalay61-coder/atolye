// ================= FATURA PENCERESİ (27 Eylül, v1.500.0 — e-fatura altyapısı, Aşama 2) =================
//
// Satış fişinin "İşlemler" menüsünden açılır. Üç iş yapar, hiçbiri dışarıya bağlanmaz:
//   1. ÖNİZLEME — faturanın alıcıya gidecek hâli (satıcı/alıcı, satırlar, oran bazında KDV, yazıyla tutar).
//      Üstünde büyük "TASLAK" yazar: bu kâğıt fatura DEĞİLDİR; yazdırılıp fatura yerine verilmesin.
//   2. EKSİKLER — gönderilmesini engelleyen (kırmızı) ve bakılması gereken (turuncu) her şey, nereden
//      düzeltileceğiyle. Aşama 3'te "Gönder" düğmesi yalnız engel yokken açılacak.
//   3. TASLAK KAYDI + DENEME XML'i — seçimler (senaryo, tarih, not, kur, istisna kodu, ETTN) saklanır; XML
//      eFinans test ortamına elle yüklenip denenebilir. Numara TÜKETİLMEZ (bkz. 080-efatura).
//
// Pencere canlı veriyle çizilir (App'ten `cariler`/`tanimlar`): cari kartında vergi dairesi düzeltilince
// pencere kapatılıp açılmadan eksik listesinden düşer.

function FaturaPenceresi({ fisNo, faturalar, cariler, stok, tanimlar, muhasebe, aktifKullanici, onKaydet, onClose, onMinimize, showToast }) {
  const fis = (tumFisleriTopla(cariler, stok) || []).find((f) => f.fisNo === fisNo) || null;
  const kayit = fisinFaturasi(faturalar, fisNo);
  const [secim, setSecim] = useState(() => ({
    senaryo: (kayit && kayit.senaryo) || null, tarih: (kayit && kayit.tarih) || bugunYerel(),
    not: (kayit && kayit.not) || "", kur: (kayit && kayit.kur) || null, istisnaKodu: (kayit && kayit.istisnaKodu) || "",
  }));
  // Kaydedilmemiş taslağın ETTN'si yalnız bu pencere açıkken geçerli; kaydedilince sabitlenir.
  const [geciciEttn] = useState(() => ettnUret());
  const firma = (tanimlar && tanimlar.firmaBilgileri) || {};
  const cari = fis ? (cariler || []).find((c) => c.id === fis.cariId) || null : null;

  const kapat = (
    <>
      {onMinimize && (
        <button className="btn-ghost" onClick={onMinimize} title="Sekmede bırak, kapatma">
          <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
        </button>
      )}
      <button className="btn-ghost" onClick={onClose}><X size={14} /> Kapat</button>
    </>
  );
  const cerceve = (icerik) => (
    <div data-fatura-penceresi={fisNo} style={{ position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
      zIndex: 100, background: "rgba(34,27,20,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 900, width: "100%", maxHeight: "92vh", overflow: "auto" }}>{icerik}</div>
    </div>
  );

  if (!fis || !faturaKesilebilirFisMi(fis)) {
    return cerceve(
      <div style={{ padding: 24, display: "grid", gap: 12 }}>
        <div data-fatura-fis-yok="1" style={{ fontSize: 14 }}>
          {fis ? "Fatura yalnız satış fişinden kesilir." : `"${fisNo}" fişi bulunamadı — geri alınmış olabilir.`}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {kayit && !kayit.faturaNo && (
            <button className="btn-ghost" data-fatura-sil="1" onClick={() => { onKaydet(kayit, true); showToast("Fatura taslağı silindi"); onClose(); }}>
              <Trash2 size={13} /> Taslağı sil
            </button>
          )}
          {kapat}
        </div>
      </div>
    );
  }

  const f = faturaKur({ fis, cari, firma, kurlar: (muhasebe && muhasebe.kurlar) || {}, faturalar, bugun: bugunYerel(),
    kayit: { ...(kayit || {}), ...secim, ettn: (kayit && kayit.ettn) || geciciEttn } });
  const dogrulama = faturaDogrula(f);
  const engeller = dogrulama.filter((d) => d.seviye === "engel");
  const uyarilar = dogrulama.filter((d) => d.seviye === "uyari");
  const pb = f.paraBirimi;
  const para = (t) => `${Number(t || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
  const earsiv = f.senaryo === "EARSIVFATURA";
  const guncelle = (alan, deger) => setSecim((s) => ({ ...s, [alan]: deger }));

  const kaydet = () => {
    const simdi = new Date().toISOString();
    onKaydet({
      id: (kayit && kayit.id) || uid("fatura"), fisNo, cariId: fis.cariId, durum: "Taslak",
      ettn: (kayit && kayit.ettn) || geciciEttn,
      senaryo: secim.senaryo || f.senaryo || null, tarih: secim.tarih, not: secim.not,
      kur: pb !== "TRY" ? f.kur : null, istisnaKodu: secim.istisnaKodu,
      olusturma: (kayit && kayit.olusturma) || simdi, guncelleme: simdi,
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    });
    showToast(kayit ? "Fatura taslağı güncellendi" : "Fatura taslağı kaydedildi");
  };
  const xmlIndir = () => {
    const xml = ublTrXml(f);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `TASLAK-${fisNo}.xml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const taraf = (baslik, t, veri) => (
    <div data-fatura-taraf={veri} style={{ fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--erp-text-3)" }}>{baslik}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{t.unvan || "—"}</div>
      <div>{t.adres || "—"}</div>
      <div>{[t.ilce, t.il].filter(Boolean).join(" / ") || "—"}</div>
      {t.telefon && <div>Tel: {t.telefon}</div>}
      {t.eposta && <div>E-posta: {t.eposta}</div>}
      <div>{t.vergiDairesi ? `${t.vergiDairesi} V.D. · ` : ""}{!t.vergiNo ? "VKN/TCKN" : t.vknMi ? "VKN" : "TCKN"}: <span className="mono">{t.vergiNo || "—"}</span></div>
    </div>
  );
  const hucre = { padding: "5px 7px", fontSize: 11, borderBottom: "1px solid var(--erp-border-2)" };
  const sag = { ...hucre, textAlign: "right" };

  return cerceve(
    <>
      {/* SEÇİMLER (yazdırılmaz) */}
      <div className="no-print" style={{ padding: "16px 24px 0", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Fatura taslağı · <span className="mono">{fisNo}</span></div>
          <span data-fatura-durum={kayit ? "kayitli" : "yeni"} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: "var(--erp-r-pill)",
            background: "var(--erp-panel-2)", border: "1px solid var(--erp-line)", color: "var(--erp-text-2)" }}>
            {kayit ? `Taslak kayıtlı${kayit.guncelleme ? ` · ${tarihYaz(kayit.guncelleme, true)}` : ""}` : "Kaydedilmedi"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Senaryo">
            <select value={secim.senaryo || f.senaryo || ""} data-fatura-senaryo="1" onChange={(e) => guncelle("senaryo", e.target.value || null)} style={{ ...inputStyle, width: 190 }}>
              {!f.senaryo && <option value="">Seçin…</option>}
              {EFATURA_SENARYOLARI.map((s) => <option key={s.key} value={s.key}>{s.ad}</option>)}
            </select>
          </Field>
          <Field label="Fatura tarihi">
            <input type="date" value={secim.tarih} data-fatura-tarih="1" onChange={(e) => guncelle("tarih", e.target.value)} style={{ ...inputStyle, width: 150 }} />
          </Field>
          {pb !== "TRY" && (
            <Field label={`${pb} kuru`}>
              <input type="number" step="0.0001" value={secim.kur != null ? secim.kur : (f.kur || "")} data-fatura-kur="1"
                onChange={(e) => guncelle("kur", e.target.value === "" ? null : Number(e.target.value))} style={{ ...inputStyle, width: 110 }} />
            </Field>
          )}
          {f.satirlar.some((s) => s.kdvOrani === 0) && (
            <Field label="KDV istisna kodu">
              <input value={secim.istisnaKodu} placeholder="Ör. 351" data-fatura-istisna="1" onChange={(e) => guncelle("istisnaKodu", e.target.value.trim())} style={{ ...inputStyle, width: 100 }} />
            </Field>
          )}
          <Field label="Not (faturada görünür)">
            <input value={secim.not} data-fatura-not="1" onChange={(e) => guncelle("not", e.target.value)} style={{ ...inputStyle, width: 240 }} />
          </Field>
        </div>

        {/* EKSİKLER — nereden düzeltileceği mesajın içinde yazıyor. */}
        <div data-fatura-eksikler={engeller.length ? "engel" : uyarilar.length ? "uyari" : "tamam"}
          style={{ border: `1px solid ${engeller.length ? "var(--erp-danger)" : uyarilar.length ? "#E1A03F" : "var(--erp-primary)"}`,
            background: engeller.length ? "#B23B2E0D" : uyarilar.length ? "#FFF4E6" : "#4E6B4E0F", borderRadius: "var(--erp-r-md)", padding: "8px 12px", fontSize: 12 }}>
          {engeller.length === 0 && uyarilar.length === 0 && (
            <div style={{ color: "var(--erp-primary)", fontWeight: 700 }}>✓ Fatura eksiksiz — eFinans bağlanınca gönderilebilir.</div>
          )}
          {engeller.map((d, i) => <div key={`e${i}`} data-fatura-engel={d.alan} style={{ color: "var(--erp-danger)" }}>✗ {d.mesaj}</div>)}
          {uyarilar.map((d, i) => <div key={`u${i}`} data-fatura-uyari={d.alan} style={{ color: "#7A5A28" }}>! {d.mesaj}</div>)}
        </div>
      </div>

      {/* ÖNİZLEME — yazdırılan kısım */}
      <div id="fatura-onizleme" data-fatura-onizleme="1" style={{ padding: 24, position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: "38%", left: 0, right: 0, textAlign: "center", fontSize: 90, fontWeight: 900,
          color: "rgba(178,59,46,.08)", transform: "rotate(-18deg)", pointerEvents: "none", letterSpacing: ".1em" }}>TASLAK</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            {firma.logo && <img src={firma.logo} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain" }} />}
            {taraf("SATICI", f.satici, "satici")}
          </div>
          <div style={{ textAlign: "right", fontSize: 12, display: "grid", gap: 2 }}>
            <div data-fatura-baslik="1" style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".04em" }}>{earsiv ? "e-ARŞİV FATURA" : "e-FATURA"}</div>
            <div style={{ color: "var(--erp-danger)", fontWeight: 700, fontSize: 11 }}>TASLAK — mali değeri yoktur</div>
            <div>Senaryo: <b>{(EFATURA_SENARYOLARI.find((s) => s.key === f.senaryo) || {}).ad || "—"}</b> · Tip: SATIŞ</div>
            <div>Fatura No: <span className="mono" data-fatura-no="1">{f.onizlemeNo || "—"}</span></div>
            <div style={{ fontSize: 10, color: "var(--erp-text-3)" }}>(numara gönderimde kesinleşir)</div>
            <div>Fatura Tarihi: <span className="mono">{tarihYaz(f.tarih)}</span></div>
            <div>Fiş / İrsaliye: <span className="mono">{fisNo}</span>{f.fisTarihi ? ` · ${tarihYaz(f.fisTarihi)}` : ""}</div>
            <div style={{ fontSize: 10 }}>ETTN: <span className="mono" data-fatura-ettn="1">{f.ettn}</span>{kayit ? "" : " (kaydedilince sabitlenir)"}</div>
          </div>
        </div>

        <div style={{ margin: "14px 0", padding: "10px 12px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)" }}>
          {taraf("SAYIN", f.alici, "alici")}
        </div>

        <table data-fatura-satirlar="1" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--erp-panel-2)" }}>
              {["Sıra", "Mal / Hizmet", "Miktar", "Birim Fiyat", "KDV %", "KDV Tutarı", "Mal / Hizmet Tutarı"].map((h, i) => (
                <th key={h} style={{ ...hucre, fontSize: 10, textAlign: i >= 2 ? "right" : "left", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.satirlar.map((s) => (
              <tr key={s.sira} data-fatura-satir={s.sira}>
                <td style={hucre}>{s.sira}</td>
                <td style={hucre}>{s.ad}</td>
                <td className="mono" style={sag}>{Number(s.miktar).toLocaleString("tr-TR", { maximumFractionDigits: 6 })} {s.birim}</td>
                <td className="mono" style={sag}>{Number(s.birimFiyat).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                <td className="mono" style={sag}>{s.kdvOrani == null ? "—" : `%${s.kdvOrani}`}</td>
                <td className="mono" style={sag}>{s.kdvTutari == null ? "—" : para(s.kdvTutari)}</td>
                <td className="mono" style={sag}>{para(s.matrah)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <table data-fatura-toplamlar="1" style={{ minWidth: 300, width: "auto", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={hucre}>Mal / Hizmet Toplam Tutarı</td><td className="mono" style={sag}>{para(f.toplam.matrah)}</td></tr>
              {f.toplam.oranlar.map((o) => (
                <tr key={o.oran} data-fatura-kdv-orani={o.oran}><td style={hucre}>Hesaplanan KDV (%{o.oran})</td><td className="mono" style={sag}>{para(o.kdv)}</td></tr>
              ))}
              <tr><td style={hucre}>Vergiler Dahil Toplam Tutar</td><td className="mono" style={sag}>{para(f.toplam.genelToplam)}</td></tr>
              <tr style={{ fontWeight: 800 }}><td style={hucre}>Ödenecek Tutar</td><td className="mono" data-fatura-odenecek="1" style={sag}>{para(f.toplam.genelToplam)}</td></tr>
              {pb !== "TRY" && f.kur > 0 && (
                <tr><td style={hucre}>Kur ({pb}) · TL karşılığı</td><td className="mono" style={sag}>{f.kur} · {(f.toplam.genelToplam * f.kur).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div data-fatura-yaziyla="1" style={{ fontSize: 12, marginTop: 8 }}><b>{faturaTutarYaziyla(f.toplam.genelToplam, pb)}</b></div>
        {f.not && <div style={{ fontSize: 12, marginTop: 4 }}><b>Not:</b> {f.not}</div>}
      </div>

      <div className="no-print" style={{ display: "flex", gap: 8, padding: "0 24px 22px", flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn-primary" data-fatura-kaydet="1" onClick={kaydet}><Save size={14} /> {kayit ? "Taslağı güncelle" : "Taslağı kaydet"}</button>
        <button className="btn-ghost" data-fatura-xml="1" disabled={engeller.length > 0} onClick={xmlIndir}
          title={engeller.length ? "Önce kırmızı eksikleri giderin" : "UBL-TR 1.2 — eFinans test ortamında denemek için"}>
          <Download size={14} /> XML indir (deneme)
        </button>
        <button className="btn-ghost" onClick={() => indirYazdirilabilirHTML("#fatura-onizleme", `Fatura taslağı ${fisNo}`)}><Printer size={14} /> Yazdır</button>
        <button className="btn-ghost" data-fatura-gonder="1" disabled title="eFinans bağlantısı kurulmadı (Aşama 3)"><Mail size={14} /> eFinans'a gönder</button>
        {kayit && !kayit.faturaNo && (
          <button className="btn-ghost" data-fatura-sil="1" onClick={() => { onKaydet(kayit, true); showToast("Fatura taslağı silindi"); onClose(); }}>
            <Trash2 size={13} /> Taslağı sil
          </button>
        )}
        <span style={{ flex: 1 }} />
        {kapat}
      </div>
    </>
  );
}
