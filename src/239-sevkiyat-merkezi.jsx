// ================= DEPO > SEVKİYAT MERKEZİ + ALIŞ / SATIŞ (v1.667.0) =================
//
// Kullanıcı: "Depo alanına sevkiyat diye sekme ekleyelim, ürün stoklar satışı buradan olacak; ilave alış satış
// diye ekran yapalım, alış ve satışlar gerçekleşecek. Alış satış caridekinin aynısı olacak. Sevkiyat ise daha
// detaylı ve kapsamlı olacak." Seçilen kapsam: sevk bekleyen siparişler + koli okutarak sevk + irsaliye + geçmiş.
//
// BU İKİ EKRAN KAYIT YAZMIYOR (irsaliye bilgisi hariç). Satış/alış hep aynı kapıdan geçer: `stokFisiAc` (cari
// kartındaki fiş penceresi, 255) ve `satisFisiAcSiparisten` (sipariş köprüsü). "Tek satış ekranı" kararı
// (v1.422.0) korunuyor: depodan, cariden, siparişten "satış" deyince aynı pencere açılır, hata tek yerde aranır.
//
// İRSALİYE BİLGİSİ (plaka, şoför, adres, koli sayısı) fişin kendi CARİ HAREKETİNE yazılır (`irsaliye` alanı).
// Şemada sütunu yok; cari hareketinde şema dışı alanlar `ek`e düşer (035 semaDisiHam), yani ayrı tablo/SQL
// gerekmiyor. Peşin tahsilat satırına (muhasebeBagId) yazılmaz: o satır fişin değil kasanın kaydı.

const SEVK_SEKMELERI = [
  ["bekleyen", "Sevk bekleyen"],
  ["okut", "Koli okut"],
  ["irsaliye", "İrsaliye"],
  ["gecmis", "Geçmiş"],
];

// Siparişin henüz sevk edilmemiş çifti. `karsilanan` türetilmiş sayaç (013) — fişler silinince kendiliğinden düşer.
function siparisSevkKalani(s) {
  return (s.kalemler || []).reduce((t, k) => t + Math.max(0, (k.miktar || 0) - (k.karsilanan || 0)), 0);
}

// Satış fişlerini (Fişler ekranıyla aynı gruplama: tumFisleriTopla) sevkiyat bakışına çevirir: kaç çift, kaç
// koli, irsaliye bilgisi. Yalnız fiş numaralı ve cari satırı "Satış" olan gruplar.
function sevkFisleri(cariler, stok, koliler) {
  return tumFisleriTopla(cariler, stok)
    .filter((g) => g.fisNo && g.hareketler.some((h) => h.kaynakTip === "cari" && h.tip === "Satış" && !h.muhasebeBagId))
    .map((g) => {
      const cariSatiri = g.hareketler.find((h) => h.kaynakTip === "cari" && h.tip === "Satış" && !h.muhasebeBagId);
      const cift = g.hareketler.filter((h) => h.kaynakTip === "stok").reduce((t, h) => t + Math.abs(h.miktar || 0), 0);
      const koliSay = (koliler || []).filter((k) => k.sevkFisNo === g.fisNo).length;
      return { ...g, cariSatiri, cift, koliSay, irsaliye: (cariSatiri && cariSatiri.irsaliye) || null };
    })
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
}

function irsaliyeHTML(f, cari) {
  const ir = f.irsaliye || {};
  const e = htmlKacis;
  const satirlar = f.hareketler.filter((h) => h.kaynakTip === "stok")
    .map((h) => `<tr><td>${e(h.urunAd || "")}</td><td>${e(h.renk || "")}</td><td>${e(h.beden || "")}</td><td style="text-align:right">${Math.abs(h.miktar || 0)}</td></tr>`).join("");
  return `<h2>SEVK İRSALİYESİ</h2>
<p><b>İrsaliye / Fiş no:</b> ${e(f.fisNo)} &nbsp; <b>Tarih:</b> ${e(tarihYaz(f.gunTarihi || f.tarih))}</p>
<p><b>Alıcı:</b> ${e(cari ? cariResmiAdi(cari) : f.cariAd || "")}<br><b>Sevk adresi:</b> ${e(ir.adres || (cari && cari.adres) || "")}</p>
<p><b>Plaka:</b> ${e(ir.plaka || "")} &nbsp; <b>Şoför:</b> ${e(ir.sofor || "")} &nbsp; <b>Koli:</b> ${e(ir.koliSayisi || f.koliSay || "")}</p>
<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse"><thead><tr><th>Ürün</th><th>Renk</th><th>Beden</th><th>Çift</th></tr></thead>
<tbody>${satirlar}</tbody><tfoot><tr><td colspan="3"><b>Toplam</b></td><td style="text-align:right"><b>${f.cift}</b></td></tr></tfoot></table>
<p style="margin-top:40px">Teslim eden: ____________ &nbsp;&nbsp;&nbsp; Teslim alan: ____________</p>`;
}

function SevkiyatMerkezi({ koliler, siparisler, cariler, stok, tanimlar, uretim, muhasebe, onFisAc, onFisKaydet, onCarilerKaydet, showToast, onGoToSiparis }) {
  const [sekme, setSekme] = useState("bekleyen");
  // BÖLÜNMÜŞ EKRAN (v1.668.0 — kullanıcı: "Sevk et tıklayınca sağda veya altta ekran bölünsün, oraya koli ve
  // asortili eklensin; hangisini eklerse o ekrana gelsin; fiş bitince kaydetsin"). Ayrı pencere yerine aynı
  // satış fişi formu (255 StokFisiFormu) burada gömülü açılıyor; kayıt yine tek kapıdan (`useCariFisiKaydet`).
  const [sevkSiparisId, setSevkSiparisId] = useState(null);
  const [arama, setArama] = useState("");
  const [seciliFisNo, setSeciliFisNo] = useState(null);
  const [form, setForm] = useState({ plaka: "", sofor: "", adres: "", koliSayisi: "" });
  const [gecmisGun, setGecmisGun] = useState(30);
  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const cariBul = (id) => (cariler || []).find((c) => c.id === id) || null;
  const cariEslesir = (cari, ad) => !q || [ad, cari && cari.unvan, cari && cari.resmiUnvan].some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q));

  const bekleyenler = React.useMemo(() => (siparisler || [])
    .filter((s) => s.tip !== "Alış" && s.durum !== "İptal" && s.durum !== "Tamamlandı")
    .map((s) => ({ s, kalan: siparisSevkKalani(s), hazirKoli: (koliler || []).filter((k) => k.siparisId === s.id && (k.durum || "Hazır") !== "Sevk edildi").length }))
    .filter((x) => x.kalan > 0)
    .sort((a, b) => String(a.s.teslimTarihi || "9999").localeCompare(String(b.s.teslimTarihi || "9999"))),
  [siparisler, koliler]);
  const fisler = React.useMemo(() => sevkFisleri(cariler, stok, koliler), [cariler, stok, koliler]);
  const seciliFis = fisler.find((f) => f.fisNo === seciliFisNo) || null;

  const irsaliyeSec = (f) => {
    setSeciliFisNo(f.fisNo);
    const c = cariBul(f.cariId);
    const ir = f.irsaliye || {};
    setForm({ plaka: ir.plaka || "", sofor: ir.sofor || "", adres: ir.adres || (c && c.adres) || "", koliSayisi: ir.koliSayisi != null ? String(ir.koliSayisi) : String(f.koliSay || "") });
  };
  const irsaliyeKaydet = () => {
    if (!seciliFis) return;
    const irsaliye = { plaka: form.plaka.trim().toLocaleUpperCase("tr-TR"), sofor: form.sofor.trim(), adres: form.adres.trim(), koliSayisi: Number(form.koliSayisi) || 0 };
    onCarilerKaydet((cariler || []).map((c) => c.id !== seciliFis.cariId ? c : {
      ...c, hareketler: (c.hareketler || []).map((h) => (h.fisNo === seciliFis.fisNo && !h.muhasebeBagId) ? { ...h, irsaliye } : h),
    }));
    showToast(`İrsaliye bilgisi kaydedildi: ${seciliFis.fisNo}`);
  };
  const yazdir = (f) => belgeyiYazdir(irsaliyeHTML(f, cariBul(f.cariId)), `İrsaliye ${f.fisNo}`);

  const sinirTarih = new Date(Date.now() - gecmisGun * 86400000).toISOString().slice(0, 10);
  const gecmis = fisler.filter((f) => String(f.gunTarihi || f.tarih || "").slice(0, 10) >= sinirTarih && cariEslesir(cariBul(f.cariId), f.cariAd));

  const kutu = { border: "1px solid var(--erp-border)", borderRadius: 8, padding: 10, background: "var(--erp-surface)" };
  const th = { textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--erp-muted)", borderBottom: "1px solid var(--erp-border)" };
  const td = { padding: "6px 8px", borderBottom: "1px solid var(--erp-border)", fontSize: 13 };

  return (
    <div data-sevkiyat-merkezi="1" className="renkli-form" style={{ "--hrk-renk": "#5A6B4E" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {SEVK_SEKMELERI.map(([k, ad]) => (
          <button key={k} data-sevk-sekme={k} data-secili={sekme === k ? "1" : undefined}
            className={sekme === k ? "btn-primary" : "btn-ghost"} onClick={() => setSekme(k)}>
            {ad}{k === "bekleyen" ? ` (${bekleyenler.length})` : ""}
          </button>
        ))}
        {(sekme === "gecmis" || sekme === "irsaliye") && (
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Cari ara…" style={{ marginLeft: "auto", minWidth: 180 }} />
        )}
      </div>

      {sekme === "bekleyen" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        <div style={{ ...kutu, flex: sevkSiparisId ? "1 1 380px" : "1 1 100%", minWidth: 0, maxWidth: sevkSiparisId ? 560 : undefined }} data-sevk-bekleyen="1">
          {bekleyenler.length === 0 ? <div style={{ color: "var(--erp-muted)" }}>Sevk bekleyen satış siparişi yok.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Sipariş</th><th style={th}>Cari</th><th style={th}>Termin</th><th style={{ ...th, textAlign: "right" }}>Kalan çift</th><th style={{ ...th, textAlign: "right" }}>Hazır koli</th><th style={th}></th></tr></thead>
              <tbody>{bekleyenler.map(({ s, kalan, hazirKoli }) => {
                const c = cariBul(s.cariId);
                const gecikti = s.teslimTarihi && s.teslimTarihi < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={s.id} data-sevk-bekleyen-satir={s.siparisNo}>
                    <td style={td}><a href="#" onClick={(e) => { e.preventDefault(); onGoToSiparis && onGoToSiparis(s.id); }}>{s.siparisNo}</a></td>
                    <td style={td}>{c ? c.unvan : "—"}</td>
                    <td style={{ ...td, color: gecikti ? "var(--erp-danger)" : undefined }}>{s.teslimTarihi ? tarihYaz(s.teslimTarihi) : "—"}{gecikti ? " · gecikti" : ""}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{kalan}</td>
                    <td style={{ ...td, textAlign: "right" }}>{hazirKoli || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button className={sevkSiparisId === s.id ? "btn-ghost" : "btn-primary"} data-sevk-et={s.siparisNo}
                        onClick={() => setSevkSiparisId(sevkSiparisId === s.id ? null : s.id)}>{sevkSiparisId === s.id ? "Kapat" : "Sevk et"}</button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
        {sevkSiparisId && (() => {
          const sp = (siparisler || []).find((x) => x.id === sevkSiparisId);
          if (!sp) return null;
          return (
            <SevkFisPaneli key={sp.id} siparis={sp} cari={cariBul(sp.cariId)} cariler={cariler} stok={stok} siparisler={siparisler}
              koliler={koliler} uretim={uretim} tanimlar={tanimlar} muhasebe={muhasebe} showToast={showToast}
              onKapat={() => setSevkSiparisId(null)}
              onKaydet={(fis) => { onFisKaydet(fis.cariId || sp.cariId, "Satış", fis); setSevkSiparisId(null); }} />
          );
        })()}
        </div>
      )}

      {sekme === "okut" && (
        <SevkiyatEkrani koliler={koliler} siparisler={siparisler} cariler={cariler} stok={stok} tanimlar={tanimlar}
          uretim={uretim} onFisAc={onFisAc} showToast={showToast} onGoToSiparis={onGoToSiparis} />
      )}

      {sekme === "irsaliye" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }} data-sevk-irsaliye="1">
          <div style={{ ...kutu, maxHeight: 480, overflow: "auto" }}>
            {fisler.filter((f) => cariEslesir(cariBul(f.cariId), f.cariAd)).slice(0, 100).map((f) => (
              <div key={f.fisNo} data-irsaliye-fis={f.fisNo} onClick={() => irsaliyeSec(f)}
                style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: f.fisNo === seciliFisNo ? "var(--erp-hover, rgba(0,0,0,.06))" : undefined, display: "flex", gap: 8 }}>
                <b>{f.fisNo}</b><span style={{ flex: 1 }}>{f.cariAd}</span>
                <span style={{ color: "var(--erp-muted)" }}>{f.cift} çift</span>
                {f.irsaliye && <span title="İrsaliye bilgisi girildi">🚚</span>}
              </div>
            ))}
            {fisler.length === 0 && <div style={{ color: "var(--erp-muted)" }}>Henüz satış fişi yok.</div>}
          </div>
          <div style={kutu}>
            {!seciliFis ? <div style={{ color: "var(--erp-muted)" }}>Soldan bir satış fişi seçin.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                <div><b>{seciliFis.fisNo}</b> · {seciliFis.cariAd} · {seciliFis.cift} çift</div>
                <label>Plaka<input data-irsaliye-plaka="1" value={form.plaka} onChange={(e) => setForm({ ...form, plaka: e.target.value })} style={{ width: "100%" }} /></label>
                <label>Şoför<input data-irsaliye-sofor="1" value={form.sofor} onChange={(e) => setForm({ ...form, sofor: e.target.value })} style={{ width: "100%" }} /></label>
                <label>Sevk adresi<textarea data-irsaliye-adres="1" rows={2} value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} style={{ width: "100%" }} /></label>
                <label>Koli sayısı<input data-irsaliye-koli="1" type="number" min="0" value={form.koliSayisi} onChange={(e) => setForm({ ...form, koliSayisi: e.target.value })} style={{ width: "100%" }} /></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" data-irsaliye-kaydet="1" onClick={irsaliyeKaydet}>Kaydet</button>
                  <button className="btn-ghost" data-irsaliye-yazdir="1" onClick={() => yazdir({ ...seciliFis, irsaliye: { ...form } })}>Yazdır</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sekme === "gecmis" && (
        <div style={kutu} data-sevk-gecmis="1">
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            {[7, 30, 90, 365].map((g) => (
              <button key={g} className={gecmisGun === g ? "btn-primary" : "btn-ghost"} onClick={() => setGecmisGun(g)}>Son {g} gün</button>
            ))}
            <span style={{ marginLeft: "auto", color: "var(--erp-muted)" }}>
              {gecmis.length} sevk · {gecmis.reduce((t, f) => t + f.cift, 0)} çift · {gecmis.reduce((t, f) => t + f.koliSay, 0)} koli
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Tarih</th><th style={th}>Fiş</th><th style={th}>Cari</th><th style={{ ...th, textAlign: "right" }}>Çift</th><th style={{ ...th, textAlign: "right" }}>Koli</th><th style={th}>Araç</th><th style={th}></th></tr></thead>
            <tbody>{gecmis.map((f) => (
              <tr key={f.fisNo} data-sevk-gecmis-satir={f.fisNo}>
                <td style={td}>{tarihYaz(f.gunTarihi || f.tarih)}</td>
                <td style={td}>{f.fisNo}</td>
                <td style={td}>{f.cariAd}</td>
                <td style={{ ...td, textAlign: "right" }}>{f.cift}</td>
                <td style={{ ...td, textAlign: "right" }}>{(f.irsaliye && f.irsaliye.koliSayisi) || f.koliSay || "—"}</td>
                <td style={td}>{f.irsaliye ? [f.irsaliye.plaka, f.irsaliye.sofor].filter(Boolean).join(" · ") : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}><button className="btn-ghost" onClick={() => yazdir(f)}>İrsaliye yazdır</button></td>
              </tr>
            ))}</tbody>
          </table>
          {gecmis.length === 0 && <div style={{ color: "var(--erp-muted)", padding: 8 }}>Bu aralıkta sevk yok.</div>}
        </div>
      )}
    </div>
  );
}

// ALIŞ / SATIŞ: "caridekinin aynısı" — önce tip ve cari seçilir, sonra cari kartındaki fiş penceresi açılır.
// Altında son alış/satış fişleri (Fişler ekranıyla aynı gruplama).
function AlisSatisEkrani({ cariler, stok, onFisAc, onFiseGit }) {
  const [tip, setTip] = useState("Satış");
  const [cariId, setCariId] = useState(null);
  const cari = (cariler || []).find((c) => c.id === cariId) || null;
  const son = React.useMemo(() => tumFisleriTopla(cariler, stok)
    .filter((g) => g.fisNo && g.hareketler.some((h) => h.kaynakTip === "cari" && h.tip === tip && !h.muhasebeBagId))
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")))
    .slice(0, 30), [cariler, stok, tip]);
  const renk = HAREKET_TIPI_RENK[tip];
  return (
    <div data-alis-satis="1" className="renkli-form" style={{ "--hrk-renk": renk }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {["Satış", "Alış"].map((t) => (
          <button key={t} data-alis-satis-tip={t} data-secili={tip === t ? "1" : undefined}
            onClick={() => setTip(t)} className={tip === t ? "btn-primary" : "btn-ghost"}
            style={tip === t ? { background: HAREKET_TIPI_RENK[t], borderColor: HAREKET_TIPI_RENK[t] } : undefined}>
            <HareketIkonu tip={t} /> {t}
          </button>
        ))}
        <CariSecici cariler={(cariler || []).filter((c) => !c.pasif)} deger={cariId} onDegis={setCariId} veriAdi="alis-satis-cari" minGenislik={260} />
        <button className="btn-primary" data-alis-satis-ac="1" disabled={!cari}
          style={{ background: renk, borderColor: renk }}
          onClick={() => cari && onFisAc(cari.id, tip, cari.unvan, null, "Depo › Alış / Satış")}>
          {tip} fişi aç
        </button>
      </div>
      <div style={{ border: "1px solid var(--erp-border)", borderRadius: 8, padding: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Son {tip.toLocaleLowerCase("tr-TR")} fişleri</div>
        {son.length === 0 && <div style={{ color: "var(--erp-muted)" }}>Kayıt yok.</div>}
        {son.map((g) => (
          <div key={g.fisNo} data-alis-satis-fis={g.fisNo} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--erp-border)" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onFiseGit && onFiseGit(g.fisNo); }}><b>{g.fisNo}</b></a>
            <span>{tarihYaz(g.gunTarihi || g.tarih)}</span>
            <span style={{ flex: 1 }}>{g.cariAd}</span>
            <span>{g.hareketler.filter((h) => h.kaynakTip === "stok").reduce((t, h) => t + Math.abs(h.miktar || 0), 0)} adet</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sevk et'in bölünmüş paneli: üstte siparişin kalanı (renk × beden) ve hazır kolileri, altında satış fişi formu.
// Fişin kendi araçları (Koli barkodu okut, Siparişten seç — koli ya da beden beden, asorti girişi) aynen burada;
// eklenen her şey formun kalem listesine düşer. Kaydet/Vazgeç formun kendi düğmeleri — kaydet mantığına (onay
// penceresi, peşin, defter) hiç dokunulmuyor; kayıt bitince panel kapanır.
function SevkFisPaneli({ siparis, cari, cariler, stok, siparisler, koliler, uretim, tanimlar, muhasebe, showToast, onKapat, onKaydet }) {
  const panelId = `sevk-panel-${siparis.id}`;
  const kalanlar = (siparis.kalemler || []).map((k) => ({ k, kalan: Math.max(0, (k.miktar || 0) - (k.karsilanan || 0)) })).filter((x) => x.kalan > 0);
  const hazirKoliler = (koliler || []).filter((k) => k.siparisId === siparis.id && (k.durum || "Hazır") !== "Sevk edildi");
  // DEPODAKİ MİKTAR (v1.688.7 — kullanıcı: "sevkiyatta sorun var, daha gelişmiş olması gerekli"): kalemin renk/beden
  // varyantındaki stok. Fiş bununla dolar; eksik kalan stok matriste kırmızı görünür.
  const stokta = (k) => {
    const p = (stok || []).find((u) => u.id === k.urunId);
    const v = p && (p.variants || []).find((x) => stokAnahtarNrm(x.renk) === stokAnahtarNrm(k.renk) && stokAnahtarNrm(x.beden) === stokAnahtarNrm(k.beden));
    return v ? Math.max(0, Number(v.miktar) || 0) : 0;
  };
  // FİŞ DOLDURMA (kullanıcı: "cariye satış fişi açılacak, Ekle'ye tıklayınca koli, asorti, beden olarak eklenebilecek;
  // birden fazla satırda"): varsayılan BOŞ fiş + "Siparişten seç" listesi AÇIK — her satırın Ekle'si satırı Kalem Ekle
  // alanına yükler (asorti / beden elle), hazır koliler koli adedi olarak eklenir; istenen kadar satır. Kısayol: fişi
  // stoktakilerle ya da kalanın tümüyle tek seferde doldur. Satırlar siparişe bağlı (089 karşılananı artırır).
  // Seçim değişince form baştan kurulur (key).
  const [dolum, setDolum] = useState("bos");
  const baslangic = React.useMemo(() => {
    if (dolum === "bos") return null;
    const liste = kalanlar.map(({ k, kalan }) => {
      const miktar = dolum === "stok" ? Math.min(kalan, stokta(k)) : kalan;
      return miktar > 0 ? {
        urunId: k.urunId, urunAd: k.urunAd, renk: k.renk || "", beden: k.beden || "", miktar, birim: k.birim || "",
        birimFiyat: k.birimFiyat || 0, paraBirimi: k.paraBirimi || "TRY", kalemId: k.id,
        siparis: { id: siparis.id, siparisNo: siparis.siparisNo, rezervasyonSiparisId: siparis.rezervasyonSiparisId || null },
        ...(typeof k.kdvOrani === "number" ? { kdvOrani: k.kdvOrani } : {}),
      } : null;
    }).filter(Boolean);
    return liste.length ? liste : null;
  }, [dolum, siparis, stok]);  // eslint-disable-line react-hooks/exhaustive-deps

  // MATRİS: satır = ürün + renk, sütun = beden; hücrede kalan ve altında stok (yetmiyorsa kırmızı).
  const bedenler = [...new Set(kalanlar.map((x) => x.k.beden || ""))].sort((a, b) => String(a).localeCompare(String(b), "tr", { numeric: true }));
  const satirlar = [];
  kalanlar.forEach(({ k, kalan }) => {
    const anahtar = `${k.urunAd || ""}|${k.renk || ""}`;
    let r = satirlar.find((x) => x.anahtar === anahtar);
    if (!r) { r = { anahtar, urun: k.urunAd || "", renk: k.renk || "", hucre: {} }; satirlar.push(r); }
    const h = r.hucre[k.beden || ""] || { kalan: 0, stok: 0 };
    h.kalan += kalan; h.stok = stokta(k);
    r.hucre[k.beden || ""] = h;
  });
  const toplamKalan = kalanlar.reduce((t, x) => t + x.kalan, 0);
  const toplamSevkEdilir = kalanlar.reduce((t, x) => t + Math.min(x.kalan, stokta(x.k)), 0);
  const th = { padding: "5px 8px", fontSize: 10, color: "var(--erp-text-2)", textAlign: "center", position: "sticky", top: 0, background: "var(--erp-panel)" };
  return (
    <div data-sevk-fis-paneli={siparis.siparisNo} style={{ flex: "2 1 560px", minWidth: 0, border: "2px solid var(--erp-info)", borderRadius: 10, background: "var(--erp-surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--erp-border)", flexWrap: "wrap" }}>
        <Truck size={16} />
        <b>Sevk: {siparis.siparisNo}</b><span>· {cari ? cari.unvan : ""}</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>· kalan <b>{toplamKalan}</b> · stokta sevk edilebilir <b style={{ color: toplamSevkEdilir < toplamKalan ? "var(--erp-warn)" : "var(--erp-primary)" }}>{toplamSevkEdilir}</b></span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn-ghost" data-sevk-kapat="1" onClick={onKapat} title="Fişi kaydetmeden kapat">✕</button>
        </span>
      </div>
      <div style={{ padding: "8px 10px" }}>
        {hazirKoliler.length > 0 && <div style={{ fontSize: 12, marginBottom: 6 }}>Hazır koli: {hazirKoliler.map((k) => k.kod).join(", ")} — kolileri "Koli okut" sekmesinden sevk edebilirsiniz.</div>}
        <div data-sevk-matris="1" style={{ maxHeight: 280, overflow: "auto", border: "1.5px solid var(--erp-line)", borderRadius: 8, background: "#fff" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Ürün</th><th style={{ ...th, textAlign: "left" }}>Renk</th>
              {bedenler.map((b) => <th key={b} style={th}>{b || "—"}</th>)}
              <th style={th}>Toplam</th>
            </tr></thead>
            <tbody>{satirlar.map((r) => {
              const top = Object.values(r.hucre).reduce((t, h) => t + h.kalan, 0);
              return (
                <tr key={r.anahtar} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                  <td style={{ padding: "4px 8px", fontWeight: 600 }}>{r.urun}</td>
                  <td style={{ padding: "4px 8px" }}>{r.renk}</td>
                  {bedenler.map((b) => {
                    const h = r.hucre[b];
                    if (!h) return <td key={b} />;
                    const eksik = h.stok < h.kalan;
                    return (
                      <td key={b} className="mono" style={{ padding: "3px 6px", textAlign: "center", lineHeight: 1.15 }} title={`Kalan ${h.kalan} · stokta ${h.stok}`}>
                        <b>{h.kalan}</b><div style={{ fontSize: 9, color: eksik ? "var(--erp-accent)" : "var(--erp-primary)" }}>stok {h.stok}</div>
                      </td>
                    );
                  })}
                  <td className="mono" style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700 }}>{top}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8, fontSize: 12 }}>
          <span style={{ fontWeight: 700 }}>Fişi doldur:</span>
          {[["bos", "Satır satır ekle"], ["stok", `Stoktakilerle doldur (${toplamSevkEdilir})`], ["tumu", `Kalanın tümüyle doldur (${toplamKalan})`]].map(([k, ad]) => (
            <button key={k} type="button" data-sevk-dolum={k} className={dolum === k ? "btn-primary" : "btn-ghost"} onClick={() => setDolum(k)}
              style={{ padding: "3px 10px", fontSize: 12 }}>{ad}</button>
          ))}
          <span style={{ color: "var(--erp-text-3)" }}>{dolum === "bos" ? "Aşağıda \"Siparişten seç\" listesinden satırın Ekle'sine basın: koli, asorti ya da beden beden girip ekleyin." : "Satırlar siparişe bağlı; fişte miktarı değiştirip silebilirsiniz."}</span>
        </div>
      </div>
      <div style={{ padding: 10 }}>
        <StokFisiFormu key={`${panelId}|${dolum}`} pencereId={panelId} tip="Satış" cari={cari} cariler={cariler} stok={stok} siparisler={siparisler}
          koliler={koliler} uretim={uretim} asortiler={tanimlar.asortiler || []} kurlar={(muhasebe && muhasebe.kurlar) || {}}
          muhasebe={muhasebe} firmaBilgileri={tanimlar.firmaBilgileri} showToast={showToast} baslangicKalemler={baslangic} siparistenSecAcikBasla={dolum === "bos"}
          onCariDegisti={() => {}} onVazgec={onKapat} onKaydet={onKaydet} />
      </div>
    </div>
  );
}
