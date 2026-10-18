// ================= PERSONEL BİLGİLERİ VE MESAİ (v1.700) =================
// Kullanıcı: "Personel olarak seçildiğinde maaş, işe başlangıç günü v.s girilecek; maaşta mesai hesaplaması için bölüm
// yapmamız lazım — mesai saati hafta içi ve hafta sonu Cumartesi, Pazar ayrı; aylık çalışma saatleri." Kararlar: saat ücreti
// = maaş ÷ aylık çalışma saati, mesai = saat ücreti × kat; saatler AYLIK TOPLAM girilir; mesai AYRI "Mesai" fişi (maaşa
// karışmaz), maaş gibi bölümün işçilik kartına düşer (015 maasHareketiMi).
//
// VERİ TEK YERDE: maaş ve personel bilgileri bölümün personel satırında (tanimlar.bolumler[].personel[{cariId, maas,
// iseBaslangic, aylikSaat}]) — ay başı maaş tahakkuku (100 maasTahakkukEt) zaten oradan okuyor; cari kartı aynı satırı
// düzenler. Bölüm değişince satır eski bölümden çıkar, yenisine taşınır.
function personelBolumKaydi(tanimlar, cariId) {
  for (const b of ((tanimlar && tanimlar.bolumler) || [])) {
    const p = (b.personel || []).find((x) => x.cariId === cariId);
    if (p) return { bolum: b, kayit: p };
  }
  return { bolum: null, kayit: null };
}
function personelKaydiniYaz(tanimlar, cariId, bolumId, alanlar) {
  const { kayit } = personelBolumKaydi(tanimlar, cariId);
  const yeni = { ...(kayit || { cariId }), ...alanlar, cariId };
  const bolumler = (tanimlar.bolumler || []).map((b) => {
    const kalan = (b.personel || []).filter((x) => x.cariId !== cariId);
    return b.id === bolumId ? { ...b, personel: [...kalan, yeni] } : { ...b, personel: kalan };
  });
  return { ...tanimlar, bolumler };
}

function PersonelBilgileriPaneli({ cari, tanimlar, onTanimlarKaydet, onAddHareket, showToast }) {
  const { bolum, kayit } = personelBolumKaydi(tanimlar, cari.id);
  const ayar = mesaiAyari(tanimlar);
  const bugun = new Date();
  const [ay, setAy] = useState(`${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}`);
  const [saat, setSaat] = useState({ haftaIci: "", cumartesi: "", pazar: "" });
  const bolumler = (tanimlar && tanimlar.bolumler) || [];
  const yaz = (bolumId, alanlar) => {
    if (!bolumId) { if (showToast) showToast("Önce bölüm seçin (Tanımlar › Ürün › Atölye İçi Bölümler)"); return; }
    onTanimlarKaydet(personelKaydiniYaz(tanimlar, cari.id, bolumId, alanlar));
  };
  const maas = Number(kayit && kayit.maas) || 0;
  const aylikSaat = Number(kayit && kayit.aylikSaat) || ayar.aylikSaat;
  const h = mesaiHesapla(maas, aylikSaat, saat, ayar);
  const fisNo = mesaiFisNo(ay, cari);
  const mevcut = (cari.hareketler || []).find((x) => x.fisNo === fisNo);
  const kutu = { ...inputStyle, width: 110, fontSize: 13 };
  return (
    <div data-personel-paneli style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, margin: "10px 0", background: "#fff" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Personel bilgileri <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>atölye içi, maaşlı — teslimde cariye işçilik yazılmaz</span></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label="Bölüm">
          <select data-personel-bolum value={bolum ? bolum.id : ""} onChange={(e) => yaz(e.target.value, {})} style={{ ...inputStyle, width: 170 }}>
            <option value="">— seçin —</option>
            {bolumler.map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
          </select>
        </Field>
        <Field label="Aylık maaş (₺)">
          <input data-personel-maas type="text" inputMode="decimal" key={`m${maas}`} defaultValue={maas || ""} disabled={!bolum}
            onBlur={(e) => bolum && yaz(bolum.id, { maas: parseFloat(String(e.target.value).replace(",", ".")) || 0 })} style={kutu} />
        </Field>
        <Field label="İşe başlangıç">
          <input data-personel-baslangic type="date" value={(kayit && kayit.iseBaslangic) || ""} disabled={!bolum}
            onChange={(e) => bolum && yaz(bolum.id, { iseBaslangic: e.target.value })} style={{ ...kutu, width: 150 }} />
        </Field>
        <Field label="Aylık çalışma saati">
          <input data-personel-saat type="number" key={`s${aylikSaat}`} defaultValue={(kayit && kayit.aylikSaat) || ""} placeholder={String(ayar.aylikSaat)} disabled={!bolum}
            onBlur={(e) => bolum && yaz(bolum.id, { aylikSaat: parseFloat(e.target.value) || undefined })} style={{ ...kutu, width: 90 }} />
        </Field>
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", paddingBottom: 8 }}>Saat ücreti: <b>{h.saatUcreti.toLocaleString("tr-TR")} ₺</b></div>
      </div>
      {bolum && maas > 0 && (
        <div data-mesai style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--erp-line-soft)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Mesai <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>
            katlar: hafta içi ×{ayar.haftaIci} · Cumartesi ×{ayar.cumartesi} · Pazar ×{ayar.pazar} (Tanımlar › Atölye İçi Bölümler)</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Ay"><input data-mesai-ay type="month" value={ay} onChange={(e) => setAy(e.target.value)} style={{ ...kutu, width: 150 }} /></Field>
            {[["haftaIci", "Hafta içi (saat)"], ["cumartesi", "Cumartesi (saat)"], ["pazar", "Pazar (saat)"]].map(([k, et]) => (
              <Field key={k} label={et}><input data-mesai-saat={k} type="number" min="0" step="0.5" value={saat[k]} onChange={(e) => setSaat({ ...saat, [k]: e.target.value })} style={{ ...kutu, width: 90 }} /></Field>
            ))}
            <div style={{ fontSize: 13, paddingBottom: 8 }}>Tutar: <b data-mesai-tutar>{h.tutar.toLocaleString("tr-TR")} ₺</b></div>
            <button type="button" className="btn-primary" data-mesai-yaz disabled={!(h.tutar > 0) || !!mevcut} style={{ marginBottom: 4 }}
              title={mevcut ? `${fisNo} zaten yazılmış — değiştirmek için önce fişi silin` : ""}
              onClick={() => {
                const ayAdi = new Date(`${ay}-01T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
                const ok = onAddHareket(cari.id, { tarih: `${ay}-${String(new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)), 0).getDate()).padStart(2, "0")}`,
                  islemTipi: "Mesai", yon: hareketYonu("Maaş"), tutar: h.tutar, paraBirimi: "TRY", odemeSekli: "Nakit", vade: "",
                  defter: iscilikDefteri(tanimlar && tanimlar.firmaBilgileri), fisNo, bolumId: bolum.id,
                  giderKartId: (bolumGiderKarti(tanimlar, bolum) || {}).id,
                  aciklama: `${bolum.ad} — ${ayAdi} mesaisi: hafta içi ${Number(saat.haftaIci) || 0} s, Cmt ${Number(saat.cumartesi) || 0} s, Pzr ${Number(saat.pazar) || 0} s`,
                  mesaiSaatleri: { haftaIci: Number(saat.haftaIci) || 0, cumartesi: Number(saat.cumartesi) || 0, pazar: Number(saat.pazar) || 0 } });
                if (ok !== false) setSaat({ haftaIci: "", cumartesi: "", pazar: "" });
              }}>
              Mesaiyi yaz
            </button>
            {mevcut && <span style={{ fontSize: 12, color: "var(--erp-warn)", paddingBottom: 8 }}>{fisNo} yazılmış ({(mevcut.tutar || 0).toLocaleString("tr-TR")} ₺)</span>}
          </div>
        </div>
      )}
    </div>
  );
}
