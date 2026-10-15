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
// SİPARİŞSİZ DE (v1.645.10 — kullanıcı: "ödeme için kasa banka işlemleri gibi açabilir"): Finans › Ödeme & Tahsilat
// nakit / havale / kredi kartında cari kartını açmak yerine BU kısa formu kullanır (siparis = null: sipariş bağı
// yazılmaz). `odemeSekli` başlangıç şeklini, `hesapOnSecim` şekle uygun ilk hesabı seçer (nakit → kasa, diğerleri →
// banka; carinin para birimindeki önce). Sipariş kartında ikisi de verilmiyor — davranış aynı.
const KISA_FORM_SEKILLERI = ["Nakit", "Havale/EFT", "Kredi Kartı"];
function SiparisOdemeFormu({ siparis, cari, tip, tutar, paraBirimi, odemeSekli, hesapOnSecim, muhasebe, kurlar, onKaydet, onVazgec, showToast }) {
  const sip = siparis || {};
  const hesaplar = [
    ...(((muhasebe && muhasebe.kasalar) || []).map((k) => ({ deger: `kasa:${k.id}`, ad: `Kasa: ${k.ad}`, kisaAd: k.ad, pb: k.paraBirimi || "TRY" }))),
    ...(((muhasebe && muhasebe.bankalar) || []).map((b) => ({ deger: `banka:${b.id}`, ad: `Banka: ${b.ad}`, kisaAd: b.ad, pb: b.paraBirimi || "TRY" }))),
  ];
  const [form, setForm] = useState(() => {
    const sekil = KISA_FORM_SEKILLERI.includes(odemeSekli) ? odemeSekli : "Nakit";
    let hesap = "";
    if (hesapOnSecim) {
      const tur = sekil === "Nakit" ? "kasa:" : "banka:";
      const aday = hesaplar.filter((h) => h.deger.startsWith(tur));
      hesap = ((aday.find((h) => h.pb === (paraBirimi || "TRY")) || aday[0]) || {}).deger || "";
    }
    return {
      tarih: bugunYerel(), tutar: tutar > 0 ? String(Math.round(tutar * 100) / 100) : "", paraBirimi: paraBirimi || "TRY",
      defter: sip.defterTercihi || "Genel", odemeSekli: sekil, hesap, hesapTutar: "",
      aciklama: sip.siparisNo ? `Sipariş ${sip.siparisNo}` : "",
    };
  });
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
    const cariHareketi = siparis ? { ...kurulan.cariHareketi, siparisId: siparis.id, siparisNo: siparis.siparisNo } : kurulan.cariHareketi;
    onKaydet({ cariId: cari.id, cariHareketi, muhasebe: kurulan.muhasebeHareketi ? { hesapTur, hesapId, hareket: kurulan.muhasebeHareketi } : null });
  }

  const renk = HAREKET_TIPI_RENK[tip] || "var(--erp-text-2)";
  return (
    <div data-siparis-odeme-formu={tip} style={{ background: "#fff", border: `1.5px solid ${renk}`, borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 10 }}>
      {/* MOR KAYIT ŞERİDİ (v1.625.0 — "Tüm kaydetler üst mor şeritte olsun"): Kaydet · Vazgeç formun üstünde. */}
      <div data-siparis-odeme-seridi="1" style={{ ...MOR_SERIT_STIL, display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap", padding: "6px 10px" }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(renk, "22"), color: renk, display: "inline-flex", alignItems: "center", gap: 5 }}><HareketIkonu tip={tip} size={13} />{tip}</span>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{cari.unvan}{sip.siparisNo ? ` · ${sip.siparisNo}` : ""}</span>
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
            {KISA_FORM_SEKILLERI.map((o) => <option key={o} value={o}>{o}</option>)}
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

// ÖDEME & TAHSİLAT TEK SATIR (v1.645.13 — kullanıcı: "cari seçilen yere kasa banka seçilsin, hepsi kendi bölümünde; bir
// altta cari seçilsin; ödeme şekli kaldırılsın, ayrı ayrı girildiği için belli; tek satıra sığsın. Nakit ve EFT/havale
// için geçerli. Kredi kartında vade tarihi olacak — ödemenin ne zaman hesaba geçeceği"). Şekil ve hesap formun DIŞINDA
// (260 mor şerit: şekil çipleri → kasa/banka → cari); burada yalnız tarih, tutar, (kur farkı), (kartta hesaba geçiş),
// defter, açıklama, Kaydet. Çekirdek yine `kasaCariHareketiKur` (207). KREDİ KARTI: cari hareketi işlem tarihinde (borç
// o gün kapanır) ve `vade` = hesaba geçiş; kasa/banka hareketi HESABA GEÇİŞ tarihinde — para bankaya o gün girer.
function OdemeSatiri({ tip, odemeSekli, hesap, cari, kurlar, onKaydet, showToast }) {
  const cariPB0 = cari.paraBirimi || "TRY";
  const [f, setF] = useState({ tarih: bugunYerel(), tutar: "", pb: cariPB0, hesapTutar: "", vade: bugunYerel(), defter: "Genel", aciklama: "" });
  const kart = odemeSekli === "Kredi Kartı";
  // MUHASEBE DEFTERİNDE İKİ P. TİPİ (v1.679.0 — kullanıcı: "genel ve resmi 2 adet p. tipi girilmesi gerekli, Excel'den
  // aktardığımız gibi"). Banka Excel'iyle aynı düzen: tutar KASAYA GİREN para (kasanın biriminde); altında Genel
  // (cariye işlenecek birim + kur) ve Resmi (Resmi defter birimi + kur) — ikisi de kasa tutarından çevrilir.
  // KASA BİRİMİ SABİT (v1.680.0 — kullanıcı: "tutardan sonra kasanın p. birimi ne ise değiştirilemez; kasaya girecek TL
  // ise TL olmak zorunda; cari hesaba işleyecek p. tipi değiştirilebilir"). Hesap seçiliyse HER defterde bu düzen:
  // tutar kasanın biriminde, altında cariye işlenecek birim + kur; Muhasebe defterinde ayrıca Resmi satırı.
  const ikili = !!hesap;
  const muhasebeMi = f.defter === "Muhasebe";
  const t = parseFloat(f.tutar);
  const hesapPB = hesap ? hesap.pb : f.pb;
  const genelH = ikili ? resmiTutarHesapla(hesapPB, t > 0 ? t : 0, f.genel || { pb: cariPB0 }, kurlar) : null;
  const resmiH = ikili && muhasebeMi ? resmiTutarHesapla(hesapPB, t > 0 ? t : 0, f.resmi || { pb: hesapPB }, kurlar) : null;
  const cevrim = !ikili && !!hesap && hesapPB !== f.pb;
  const oneriHesapTutari = cevrim && t > 0 ? paraCevirGenel(t, f.pb, hesapPB, kurlar) : null;
  // GENEL KUR KUTUSU (v1.678.0): "1 <cari PB> = ? <kasa PB>" — yazılırsa hesaba geçen = tutar × kur; hesaba geçen
  // elle yazılırsa o geçerli (kur ondan okunur). İkisi boşsa sistem kuruyla öneri.
  const elleKur = parseFloat(String(f.kur || "").replace(",", "."));
  const hesapTutari = cevrim ? (parseFloat(f.hesapTutar) || (elleKur > 0 && t > 0 ? t * elleKur : oneriHesapTutari)) : t;
  const kutu = { ...inputStyle, padding: "7px 9px" };
  function kaydet() {
    if (!hesap) { showToast(odemeSekli === "Nakit" ? "Kasayı seçin" : "Bankayı seçin"); return; }
    if (!(t > 0)) { showToast("Tutar girin"); return; }
    if (cevrim && !(hesapTutari > 0)) { showToast(`Hesaba geçecek tutarı girin (${hesapPB})`); return; }
    if (kart && !f.vade) { showToast("Hesaba geçiş tarihini girin"); return; }
    if (ikili && (!(genelH.tutar > 0) || (muhasebeMi && !(resmiH.tutar > 0)))) { showToast(muhasebeMi ? "Genel ve Resmi için kur ya da tutar girin" : "Cariye işlenecek tutar için kur girin"); return; }
    const [hesapTur, hesapId] = hesap.deger.split(":");
    if (ikili) {
      const k2 = kasaCariHareketiKur({
        islemTipi: tip, tarih: f.tarih, cariId: cari.id, cariUnvan: cari.unvan, cariTutar: stokYuvarla(genelH.tutar), cariPB: genelH.pb,
        hesapTur, hesapId, hesapAd: hesap.kisaAd, hesapPB, hesapTutar: stokYuvarla(t),
        defter: f.defter, aciklama: f.aciklama.trim(), odemeSekli, kur: genelH.pb !== hesapPB ? t / genelH.tutar : undefined,
      });
      const resmiEk2 = muhasebeMi && (resmiH.pb !== genelH.pb || Math.abs(resmiH.tutar - genelH.tutar) > 0.004) ? { resmiPB: resmiH.pb, resmiTutar: stokYuvarla(resmiH.tutar) } : {};
      const ch2 = { ...(kart ? { ...k2.cariHareketi, vade: f.vade } : k2.cariHareketi), ...resmiEk2 };
      const mh2 = k2.muhasebeHareketi && kart ? { ...k2.muhasebeHareketi, tarih: f.vade, vade: f.vade, aciklama: `${k2.muhasebeHareketi.aciklama} · kredi kartı (işlem ${tarihTr(f.tarih)})` } : k2.muhasebeHareketi;
      onKaydet({ cariId: cari.id, cariHareketi: ch2, muhasebe: mh2 ? { hesapTur, hesapId, hareket: mh2 } : null });
      setF((o) => ({ ...o, tutar: "", aciklama: "", genel: o.genel ? { pb: o.genel.pb } : o.genel, resmi: o.resmi ? { pb: o.resmi.pb } : o.resmi }));
      return;
    }
    const k = kasaCariHareketiKur({
      islemTipi: tip, tarih: f.tarih, cariId: cari.id, cariUnvan: cari.unvan, cariTutar: t, cariPB: f.pb,
      hesapTur, hesapId, hesapAd: hesap.kisaAd, hesapPB, hesapTutar: stokYuvarla(hesapTutari),
      defter: f.defter, aciklama: f.aciklama.trim(), odemeSekli, kur: cevrim && t > 0 ? hesapTutari / t : undefined,
    });
    const resmiEk = resmiAlanlari(f.defter, f.pb, t, f.resmi, kurlar);   // v1.676.0: Resmi ayrı P. tipi
    const cariHareketi = { ...(kart ? { ...k.cariHareketi, vade: f.vade } : k.cariHareketi), ...resmiEk };
    const hareket = k.muhasebeHareketi && kart ? { ...k.muhasebeHareketi, tarih: f.vade, vade: f.vade, aciklama: `${k.muhasebeHareketi.aciklama} · kredi kartı (işlem ${tarihTr(f.tarih)})` } : k.muhasebeHareketi;
    onKaydet({ cariId: cari.id, cariHareketi, muhasebe: hareket ? { hesapTur, hesapId, hareket } : null });
    setF((o) => ({ ...o, tutar: "", hesapTutar: "", aciklama: "" }));
  }
  const etiket = (s) => <span style={{ fontSize: 10, color: "var(--erp-text-3)", fontWeight: 700 }}>{s}</span>;
  const alan = (ad, icerik, en) => <label style={{ display: "grid", gap: 2, flex: en ? `1 1 ${en}px` : "0 0 auto", minWidth: 0 }}>{etiket(ad)}{icerik}</label>;
  const renk = HAREKET_TIPI_RENK[tip];
  return (
    <div data-odeme-satiri={odemeSekli} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "10px 12px",
      background: "#fff", border: `1.5px solid ${renk}`, borderRadius: "var(--erp-r-md)",
      // Kutu çerçeveleri de işlemin renginde (v1.665.1 — "giriş çıkış renk durumuna göre değişsin"; 100 .renkli-form).
      "--hrk-renk": renk }}>
      {alan(kart ? "İşlem tarihi" : "Tarih", <input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} style={{ ...kutu, width: 140 }} />)}
      {alan(ikili ? `Kasaya ${tip === "Tahsilat" ? "giren" : "çıkan"} (${hesapPB})` : "Tutar", (
        <span style={{ display: "flex", gap: 4 }}>
          <input type="number" step="0.01" data-odeme-satiri-tutar="1" value={f.tutar} autoFocus onChange={(e) => setF({ ...f, tutar: e.target.value, hesapTutar: "" })}
            onKeyDown={(e) => { if (e.key === "Enter") kaydet(); }} style={{ ...kutu, width: 120 }} />
          {!ikili && <select value={f.pb} onChange={(e) => setF({ ...f, pb: e.target.value, hesapTutar: "" })} style={{ ...kutu, width: 66 }}>
            {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
          </select>}
        </span>
      ))}
      {cevrim && alan(`Kur (1 ${f.pb} = ? ${hesapPB})`, (
        <input inputMode="decimal" data-odeme-satiri-kur="1" value={f.kur || ""}
          placeholder={t > 0 && hesapTutari > 0 ? String(Math.round((hesapTutari / t) * 10000) / 10000) : ""}
          onChange={(e) => setF({ ...f, kur: e.target.value, hesapTutar: "" })} style={{ ...kutu, width: 90 }} />
      ))}
      {cevrim && alan(`Hesaba geçen (${hesapPB})`, (
        <input type="number" step="0.01" data-odeme-satiri-hesap-tutar="1" value={f.hesapTutar}
          placeholder={hesapTutari != null && hesapTutari > 0 ? String(stokYuvarla(hesapTutari)) : (oneriHesapTutari != null ? String(stokYuvarla(oneriHesapTutari)) : "")}
          onChange={(e) => setF({ ...f, hesapTutar: e.target.value, kur: "" })} style={{ ...kutu, width: 120 }} />
      ))}
      {kart && alan("Hesaba geçiş (vade)", <input type="date" data-odeme-satiri-vade="1" value={f.vade} onChange={(e) => setF({ ...f, vade: e.target.value })} style={{ ...kutu, width: 140 }} />)}
      {alan("Defter", (
        <select value={f.defter} onChange={(e) => setF({ ...f, defter: e.target.value })} style={{ ...kutu, width: 110 }}>
          <option value="Genel">Genel</option><option value="Resmi">Resmi</option><option value="Muhasebe">Muhasebe</option>
        </select>
      ))}
      {ikili && (
        <div data-odeme-ikili-pb="1" style={{ display: "grid", gap: 4, flex: muhasebeMi ? "1 1 100%" : "0 0 auto", alignSelf: "flex-end" }}>
          <ResmiTutarAlani defter="Muhasebe" anaPB={hesapPB} anaTutar={t > 0 ? t : 0} kurlar={kurlar} deger={f.genel || { pb: cariPB0 }}
            onDegis={(v) => setF({ ...f, genel: v })} etiket={muhasebeMi ? "Genel" : "Cariye"} veri="karsi" />
          {muhasebeMi && <ResmiTutarAlani defter="Muhasebe" anaPB={hesapPB} anaTutar={t > 0 ? t : 0} kurlar={kurlar} deger={f.resmi || { pb: hesapPB }}
            onDegis={(v) => setF({ ...f, resmi: v })} ayniAd="kasa ile" />}
        </div>
      )}
      {alan("Açıklama", <input value={f.aciklama} placeholder="Opsiyonel" onChange={(e) => setF({ ...f, aciklama: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") kaydet(); }} style={{ ...kutu, width: "100%" }} />, 160)}
      <button type="button" className="btn-primary btn-save" data-odeme-satiri-kaydet="1" onClick={kaydet}
        style={{ background: renk, borderColor: renk, padding: "8px 16px", whiteSpace: "nowrap" }}>
        <HareketIkonu tip={tip} size={14} /> {tip} kaydet
      </button>
    </div>
  );
}
