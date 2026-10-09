// ================= SİPARİŞ KARTINDA TAHSİLAT / ÖDEME FORMU (v1.613.0) =================
//
// Kullanıcı (8 Ekim): "Tahsilat girişi siparişin kendi kartında da açılsın." v1.612.0'de düğme cari kartına
// köprüydü (form oradaydı). Şimdi form sipariş kartının İÇİNDE: tarih, tutar + birim, defter, ödeme şekli,
// kasa/banka (farklı para birimindeyse hesaba işlenecek tutar), açıklama. Kayıt ÇEKİRDEĞİ yine tek:
// `kasaCariHareketiKur` (207) hem cari hem kasa hareketini kurar; cari hareketi App'teki huniden
// (`addCariHareketFromStok`: fiş no THS-/ODM-, zaman, kullanıcı) geçer, kasa hareketi `muhasebeyePesinIsle`den.
// Çek/senet BURADA YOK: çek defteri, vade ve ciro mantığı cari kartındaki formda; "Cari kartında aç" bağlantısı
// (eski köprü) o form için duruyor.
//
// props: siparis, cari, tip ("Tahsilat" | "Ödeme"), tutar (öneri), paraBirimi (öneri), muhasebe, kurlar,
//        onKaydet({ cariId, cariHareketi, muhasebe: { hesapTur, hesapId, hareket } | null }), onVazgec, showToast
function SiparisOdemeFormu({ siparis, cari, tip, tutar, paraBirimi, muhasebe, kurlar, onKaydet, onVazgec, showToast }) {
  const [form, setForm] = useState({
    tarih: bugunYerel(), tutar: tutar > 0 ? String(Math.round(tutar * 100) / 100) : "", paraBirimi: paraBirimi || "TRY",
    defter: siparis.defterTercihi || "Genel", odemeSekli: "Nakit", hesap: "", hesapTutar: "",
    aciklama: siparis.siparisNo ? `Sipariş ${siparis.siparisNo}` : "",
  });
  const hesaplar = [
    ...(((muhasebe && muhasebe.kasalar) || []).map((k) => ({ deger: `kasa:${k.id}`, ad: `Kasa: ${k.ad}`, kisaAd: k.ad, pb: k.paraBirimi || "TRY" }))),
    ...(((muhasebe && muhasebe.bankalar) || []).map((b) => ({ deger: `banka:${b.id}`, ad: `Banka: ${b.ad}`, kisaAd: b.ad, pb: b.paraBirimi || "TRY" }))),
  ];
  const secili = hesaplar.find((h) => h.deger === form.hesap) || null;
  const cariPB = form.paraBirimi || "TRY";
  // Hesabın para birimi farklıysa hesaba işlenecek tutar ayrıca sorulur (cari kartındaki formla aynı kural:
  // kullanıcı gerçekte hareket eden parayı bilir; kur iki tutardan türetilir, tahmin edilmez).
  const cevrimGerekli = !!secili && secili.pb !== cariPB;
  const t = parseFloat(form.tutar);
  const hesapTutari = cevrimGerekli ? parseFloat(form.hesapTutar) : t;
  const hamOran = cevrimGerekli && hesapTutari > 0 && t > 0 ? hesapTutari / t : null;
  const kurGosterimi = (() => {
    if (!hamOran || !secili) return null;
    const soru = kurSorusu(cariPB, secili.pb, kurlar);
    if (!soru) return null;
    const deger = soru.bolme ? 1 / hamOran : hamOran;
    return `1 ${soru.a} = ${deger.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${soru.b}`;
  })();

  function hesapSec(deger) {
    const yeni = hesaplar.find((h) => h.deger === deger);
    let hesapTutar = "";
    if (yeni && yeni.pb !== cariPB && t > 0) {
      const c = paraCevirGenel(t, cariPB, yeni.pb, kurlar);
      hesapTutar = c != null ? String(stokYuvarla(c)) : "";
    }
    setForm({ ...form, hesap: deger, hesapTutar });
  }

  function kaydet() {
    if (!(t > 0)) { showToast("Tutar girin"); return; }
    if (!secili) {
      showToast(hesaplar.length === 0
        ? "Kasa/banka tanımlı değil — Finans > Kasa & Banka'dan açın, sonra kaydedin"
        : `${tip === "Tahsilat" ? "Paranın girdiği" : "Paranın çıktığı"} kasayı/bankayı seçin`);
      return;
    }
    if (cevrimGerekli && !(hesapTutari > 0)) { showToast(`Hesaba işlenecek tutarı girin (${secili.pb})`); return; }
    const [hesapTur, hesapId] = secili.deger.split(":");
    const kurulan = kasaCariHareketiKur({
      islemTipi: tip, tarih: form.tarih, cariId: cari.id, cariUnvan: cari.unvan,
      cariTutar: t, cariPB, hesapTur, hesapId, hesapAd: secili.kisaAd, hesapPB: secili.pb, hesapTutar: hesapTutari,
      defter: form.defter, aciklama: form.aciklama.trim(), odemeSekli: form.odemeSekli, kur: hamOran || undefined,
    });
    // SİPARİŞ BAĞI: sipariş kartı "Ödenen / Kalan"ı bu alandan sayar (siparisOdemeOzeti, 320). `islemTipi` huniye
    // fiş ön ekini seçtirir (THS-/ODM-); huni alanı kayda yazmaz, tip ön ekten okunur.
    const cariHareketi = { ...kurulan.cariHareketi, siparisId: siparis.id, siparisNo: siparis.siparisNo };
    onKaydet({ cariId: cari.id, cariHareketi, muhasebe: kurulan.muhasebeHareketi ? { hesapTur, hesapId, hareket: kurulan.muhasebeHareketi } : null });
  }

  const renk = HAREKET_TIPI_RENK[tip] || "var(--erp-text-2)";
  return (
    <div data-siparis-odeme-formu={tip} style={{ background: "#fff", border: `1.5px solid ${renk}`, borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 10 }}>
      {/* MOR KAYIT ŞERİDİ (v1.625.0 — "Tüm kaydetler üst mor şeritte olsun"): Kaydet · Vazgeç formun üstünde. */}
      <div data-siparis-odeme-seridi="1" style={{ ...MOR_SERIT_STIL, display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap", padding: "6px 10px" }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(renk, "22"), color: renk, display: "inline-flex", alignItems: "center", gap: 5 }}><HareketIkonu tip={tip} size={13} />{tip}</span>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{cari.unvan} · {siparis.siparisNo}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
          <button type="button" className="btn-primary btn-save" data-siparis-odeme-kaydet="1" onClick={kaydet}><Save size={14} /> Kaydet</button>
          <button type="button" className="btn-ghost" onClick={onVazgec}><X size={14} /> Vazgeç</button>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Field label="Tarih">
          <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Tutar">
          <div style={{ display: "flex", gap: 4 }}>
            <input type="number" step="0.01" data-siparis-odeme-tutar="1" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <select data-siparis-odeme-pb="1" value={cariPB} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value, hesapTutar: "" })} style={{ ...inputStyle, width: 68 }}>
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
        <Field label="Ödeme Şekli">
          <select value={form.odemeSekli} onChange={(e) => setForm({ ...form, odemeSekli: e.target.value })} style={inputStyle}>
            {["Nakit", "Havale/EFT", "Kredi Kartı"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label={tip === "Tahsilat" ? "Hangi kasaya/bankaya girdi?" : "Hangi kasadan/bankadan çıktı?"}>
          {hesaplar.length === 0 ? (
            <span style={{ fontSize: 11, color: "var(--erp-warn)", padding: "6px 0", display: "block" }}>Kasa/banka tanımlı değil — Finans &gt; Kasa &amp; Banka'dan açın.</span>
          ) : (
            <select data-siparis-odeme-hesap="1" value={form.hesap} onChange={(e) => hesapSec(e.target.value)} style={inputStyle}>
              <option value="">Seçin…</option>
              {hesaplar.map((h) => <option key={h.deger} value={h.deger}>{h.ad} ({h.pb})</option>)}
            </select>
          )}
        </Field>
        {cevrimGerekli && (
          <Field label={`Hesaba işlenecek tutar (${secili.pb})`}>
            <input type="number" step="0.01" data-siparis-odeme-hesap-tutar="1" value={form.hesapTutar} onChange={(e) => setForm({ ...form, hesapTutar: e.target.value })} style={inputStyle} />
            {kurGosterimi && <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 3 }}>{kurGosterimi}</div>}
          </Field>
        )}
        <Field label="Açıklama">
          <input data-siparis-odeme-aciklama="1" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
        </Field>
      </div>
    </div>
  );
}
