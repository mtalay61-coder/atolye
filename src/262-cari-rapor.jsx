// ================= CARİ RAPORU (v1.619.0) =================
//
// Kullanıcı (9 Ekim): "Cari siparişleri, teslim edilen, kalan vs., alacak verecek, sağlık durumu sordurduğum gibi rapor
// yapalım cari bölümüne. Raporlar başlığında carinin o anki bakiyesi vs." Cari ekranına "Liste | Raporlar" sekmesi; Raporlar'da
// bütün carilerin özet tablosu (bakiye, açık sipariş, kalan, son tahsilat, sağlık) ve seçilen carinin rapor kartı.
//
// KAYNAKLAR TEK: bakiye `cariBakiyeleri` (200), siparişe bağlı tahsilat `siparisOdemeOzeti` (320), hareket tipi
// `hareketIslemTipi` (200). Rapor hiçbir şey YAZMAZ.
//
// SAĞLIK DURUMU — kurallar açık, kullanıcıya nedenleriyle gösteriliyor (kara kutu puan yok):
//   Müşteri (bize borçlu, bakiye > 0):
//     iyi    : alacağımız yok ya da son tahsilat ≤ 30 gün
//     takip  : son tahsilat 31–60 gün önce (hiç tahsilat yoksa: en eski borç 31–60 gün)
//     riskli : son tahsilat > 60 gün önce (hiç tahsilat yoksa: en eski borç > 60 gün)
//   Tedarikçi (biz borçluyuz, bakiye < 0): son ödememiz > 60 gün → takip (borcumuz bekliyor).
//   Ek uyarılar (seviyeyi değiştirmez, nedenlere eklenir): teslim tarihi geçmiş açık sipariş; açık siparişlerin kalan
//   tutarı + mevcut alacak.
const CARI_SAGLIK = {
  iyi: { ad: "İyi", renk: "var(--erp-primary)" },
  takip: { ad: "Takip", renk: "var(--erp-warn)" },
  riskli: { ad: "Riskli", renk: "var(--erp-danger)" },
};
const CARI_SAGLIK_TAKIP_GUN = 30;
const CARI_SAGLIK_RISK_GUN = 60;

function cariGunFarki(a, b) {
  if (!a || !b) return null;
  const t1 = Date.parse(String(a).slice(0, 10)), t2 = Date.parse(String(b).slice(0, 10));
  if (isNaN(t1) || isNaN(t2)) return null;
  return Math.round((t2 - t1) / 86400000);
}

// girdi: cari, siparisler, { bugun: "YYYY-MM-DD" }
function cariRaporu(cari, siparisler, secenek = {}) {
  const bugun = secenek.bugun || bugunYerel();
  const bakiye = cariBakiyeleri(cari);          // PB → tutar; + cari bize borçlu, − biz borçluyuz
  const alacak = {}, verecek = {};
  Object.entries(bakiye).forEach(([pb, t]) => { if (t > 0) alacak[pb] = t; else if (t < 0) verecek[pb] = -t; });
  const musteriMi = cari.tip !== "Tedarikçi";
  const hareketler = (cari.hareketler || []);
  const paraTipi = musteriMi ? "Tahsilat" : "Ödeme";
  const paraHareketleri = hareketler.filter((h) => hareketIslemTipi(h) === paraTipi)
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
  const sonPara = paraHareketleri[0] || null;
  const sonParaGun = sonPara ? cariGunFarki(sonPara.tarih, bugun) : null;

  const siparisSatirlari = (siparisler || [])
    .filter((s) => s.cariId === cari.id && s.durum !== "İptal")
    .map((s) => {
      const kalemler = s.kalemler || [];
      const adet = kalemler.reduce((t, k) => t + (Number(k.miktar) || 0), 0);
      const teslim = kalemler.reduce((t, k) => t + Math.min(Number(k.karsilanan) || 0, Number(k.miktar) || 0), 0);
      const tutar = {}, kalanTutar = {};
      kalemler.forEach((k) => {
        const pb = k.paraBirimi || "TRY";
        const f = Number(k.birimFiyat) || 0;
        tutar[pb] = (tutar[pb] || 0) + (Number(k.miktar) || 0) * f;
        const kalanAdet = Math.max(0, (Number(k.miktar) || 0) - (Number(k.karsilanan) || 0));
        kalanTutar[pb] = (kalanTutar[pb] || 0) + kalanAdet * f;
      });
      const pbler = Object.keys(tutar);
      const tekPB = pbler.length === 1 ? pbler[0] : null;
      const oz = siparisOdemeOzeti(s, cari, tekPB ? tutar[tekPB] : 0, tekPB);
      const kalanAdet = Math.max(0, adet - teslim);
      const gecikti = kalanAdet > 0 && s.teslimTarihi && cariGunFarki(s.teslimTarihi, bugun) > 0;
      return {
        id: s.id, siparisNo: s.siparisNo, tip: s.tip, tarih: (s.tarih || "").slice(0, 10), teslimTarihi: s.teslimTarihi || "",
        durum: s.durum || "", adet, teslim, kalanAdet, tutar, kalanTutar, tekPB,
        odenen: oz.toplamlar, odemeKalan: tekPB && oz.toplamlar[tekPB] != null ? oz.kalan : null, gecikti: !!gecikti,
      };
    })
    .sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)));

  const topla = (liste, alan) => {
    const t = {};
    liste.forEach((r) => Object.entries(r[alan] || {}).forEach(([pb, v]) => { t[pb] = (t[pb] || 0) + v; }));
    Object.keys(t).forEach((pb) => { t[pb] = Math.round(t[pb] * 100) / 100; if (!t[pb]) delete t[pb]; });
    return t;
  };
  const acikSiparisler = siparisSatirlari.filter((r) => r.kalanAdet > 0);
  const toplam = {
    siparisSayisi: siparisSatirlari.length,
    acikSiparis: acikSiparisler.length,
    adet: siparisSatirlari.reduce((t, r) => t + r.adet, 0),
    teslim: siparisSatirlari.reduce((t, r) => t + r.teslim, 0),
    kalanAdet: siparisSatirlari.reduce((t, r) => t + r.kalanAdet, 0),
    tutar: topla(siparisSatirlari, "tutar"),
    kalanTutar: topla(acikSiparisler, "kalanTutar"),
    odenen: topla(siparisSatirlari, "odenen"),
    geciken: siparisSatirlari.filter((r) => r.gecikti).length,
  };

  // SAĞLIK
  const nedenler = [];
  let seviye = "iyi";
  const alacakVar = Object.keys(alacak).length > 0;
  const verecekVar = Object.keys(verecek).length > 0;
  if (musteriMi && alacakVar) {
    let gun = sonParaGun;
    let dayanak = sonPara ? `son tahsilat ${gun} gün önce` : null;
    if (!sonPara) {
      const borclar = hareketler.filter((h) => h.yon === "Borç" && h.tarih).map((h) => h.tarih).sort();
      gun = borclar.length ? cariGunFarki(borclar[0], bugun) : null;
      dayanak = gun != null ? `hiç tahsilat yok, en eski borç ${gun} gün önce` : "hiç tahsilat yok";
    }
    if (gun != null && gun > CARI_SAGLIK_RISK_GUN) seviye = "riskli";
    else if (gun != null && gun > CARI_SAGLIK_TAKIP_GUN) seviye = "takip";
    nedenler.push(`Alacağımız var — ${dayanak}`);
  } else if (musteriMi) {
    nedenler.push("Alacağımız yok");
  }
  if (!musteriMi && verecekVar) {
    if (sonParaGun == null || sonParaGun > CARI_SAGLIK_RISK_GUN) seviye = "takip";
    nedenler.push(`Borcumuz var — ${sonPara ? `son ödememiz ${sonParaGun} gün önce` : "henüz ödeme yapılmadı"}`);
  } else if (!musteriMi) {
    nedenler.push("Borcumuz yok");
  }
  if (toplam.geciken > 0) nedenler.push(`${toplam.geciken} siparişin teslim tarihi geçti`);
  if (toplam.acikSiparis > 0) nedenler.push(`${toplam.acikSiparis} açık sipariş, ${toplam.kalanAdet} adet teslim bekliyor`);

  return {
    cariId: cari.id, unvan: cari.unvan, tip: cari.tip, ulke: cari.ulke || "", bugun,
    bakiye, alacak, verecek, sonPara: sonPara ? { tarih: sonPara.tarih, tutar: sonPara.tutar, paraBirimi: sonPara.paraBirimi || "TRY", fisNo: sonPara.fisNo || "" } : null,
    sonParaGun, paraTipi, siparisler: siparisSatirlari, toplam, saglik: { seviye, nedenler },
  };
}

const cariRaporPara = (v, pb) => `${(Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
const cariRaporParaListe = (t) => (Object.keys(t || {}).length ? Object.entries(t).map(([pb, v]) => cariRaporPara(v, pb)).join(" + ") : "—");
const cariRaporTarih = (t) => (t ? String(t).slice(0, 10).split("-").reverse().join(".") : "—");

// Yazdır / PDF / WhatsApp gövdesi — sipariş çıktısıyla aynı görsel dil.
function cariRaporuHTML(r, firmaBilgileri) {
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const f = firmaBilgileri || {};
  const s = CARI_SAGLIK[r.saglik.seviye];
  const sagRenk = { iyi: "#2E7D4F", takip: "#B7791F", riskli: "#B3261E" }[r.saglik.seviye];
  const bakiyeKutusu = Object.keys(r.alacak).length
    ? `<div style="font-size:12px;color:#7A6A50">Alacağımız</div><div class="mono" style="font-size:22px;font-weight:800;color:#2E7D4F">${esc(cariRaporParaListe(r.alacak))}</div>`
    : Object.keys(r.verecek).length
      ? `<div style="font-size:12px;color:#7A6A50">Borcumuz</div><div class="mono" style="font-size:22px;font-weight:800;color:#B3261E">${esc(cariRaporParaListe(r.verecek))}</div>`
      : `<div style="font-size:12px;color:#7A6A50">Bakiye</div><div class="mono" style="font-size:22px;font-weight:800">0</div>`;
  const kutu = (baslik, deger) => `<td style="padding:8px 10px;border:1px solid #ddd;background:#FBF8F2"><div style="font-size:11px;color:#7A6A50">${baslik}</div><div class="mono" style="font-size:14px;font-weight:700">${deger}</div></td>`;
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #33281C;padding-bottom:8px;margin-bottom:12px">
    <div>${f.logo ? `<img src="${f.logo}" style="height:40px;margin-bottom:4px" />` : ""}<div style="font-size:16px;font-weight:700">${esc(f.unvan || "")}</div></div>
    <div style="text-align:right"><div style="font-size:11px;letter-spacing:1px;color:#7A6A50">CARİ RAPORU</div>
      <div class="mono" style="font-size:12px">${esc(cariRaporTarih(r.bugun))}</div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr>
    <td style="vertical-align:top"><div style="font-size:11px;color:#7A6A50">${esc(r.tip || "Cari")}${r.ulke ? ` · ${esc(r.ulke)}` : ""}</div><div style="font-size:18px;font-weight:800">${esc(r.unvan)}</div>
      <div style="margin-top:6px;display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:800;color:#fff;background:${sagRenk}">Durum: ${esc(s.ad)}</div></td>
    <td style="text-align:right;vertical-align:top;width:45%">${bakiyeKutusu}</td>
  </tr></table>
  <table style="width:100%;border-collapse:separate;border-spacing:6px;margin-bottom:10px"><tr>
    ${kutu("Sipariş", `${r.toplam.siparisSayisi} (${r.toplam.acikSiparis} açık)`)}
    ${kutu("Sipariş adedi", r.toplam.adet)}
    ${kutu("Teslim edilen", r.toplam.teslim)}
    ${kutu("Kalan", r.toplam.kalanAdet)}
    ${kutu(`Son ${r.paraTipi.toLocaleLowerCase("tr-TR")}`, r.sonPara ? `${esc(cariRaporTarih(r.sonPara.tarih))} · ${esc(cariRaporPara(r.sonPara.tutar, r.sonPara.paraBirimi))}` : "—")}
  </tr></table>
  <div style="font-size:12px;margin-bottom:12px">${r.saglik.nedenler.map((n) => `• ${esc(n)}`).join("<br/>")}</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <tr style="background:#F6F1E8">${["Sipariş", "Tarih", "Durum", "Adet", "Teslim", "Kalan", "Tutar", `${r.paraTipi}`, "Kalan tutar"].map((h, i) => `<th style="padding:5px 8px;border-bottom:1px solid #ccc;text-align:${i >= 3 ? "right" : "left"}">${h}</th>`).join("")}</tr>
    ${r.siparisler.map((x) => `<tr style="border-bottom:1px solid #eee${x.gecikti ? ";background:#FDECEA" : ""}">
      <td class="mono">${esc(x.siparisNo)}</td><td class="mono">${esc(cariRaporTarih(x.tarih))}</td><td>${esc(x.durum)}${x.gecikti ? " · gecikti" : ""}</td>
      <td class="mono" style="text-align:right">${x.adet}</td><td class="mono" style="text-align:right">${x.teslim}</td><td class="mono" style="text-align:right;font-weight:700">${x.kalanAdet}</td>
      <td class="mono" style="text-align:right">${esc(cariRaporParaListe(x.tutar))}</td><td class="mono" style="text-align:right;color:#2E7D4F">${esc(cariRaporParaListe(x.odenen))}</td>
      <td class="mono" style="text-align:right;font-weight:700">${x.odemeKalan != null ? esc(cariRaporPara(x.odemeKalan, x.tekPB)) : esc(cariRaporParaListe(x.tutar))}</td></tr>`).join("")}
  </table>
  <div style="margin-top:24px;font-size:10px;color:#9B8B72">Atölye ERP · ${new Date().toLocaleDateString("tr-TR")}</div>`;
}

function CariSaglikRozeti({ seviye, kucuk }) {
  const s = CARI_SAGLIK[seviye] || CARI_SAGLIK.iyi;
  return (
    <span data-cari-saglik={seviye} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: kucuk ? 10 : 12, fontWeight: 800,
      padding: kucuk ? "1px 7px" : "3px 10px", borderRadius: "var(--erp-r-pill)", color: s.renk, background: alfaEkle(s.renk, "1A"), border: `1px solid ${s.renk}` }}>
      ● {s.ad}
    </span>
  );
}

function CariRaporlari({ cariler, siparisler, firmaBilgileri, showToast, onGoToSiparis }) {
  const [arama, setArama] = useState("");
  const [tipSec, setTipSec] = useState("Tümü");
  const [seciliId, setSeciliId] = useState(null);
  const bugun = bugunYerel();
  const SIRA = { riskli: 0, takip: 1, iyi: 2 };
  const raporlar = (cariler || [])
    .filter((c) => !c.pasif && c.tip !== "Personel")
    .filter((c) => tipSec === "Tümü" || c.tip === tipSec || (c.tip === "Her İkisi"))
    .filter((c) => !arama.trim() || String(c.unvan || "").toLocaleLowerCase("tr-TR").includes(arama.trim().toLocaleLowerCase("tr-TR")))
    .map((c) => cariRaporu(c, siparisler, { bugun }))
    .sort((a, b) => SIRA[a.saglik.seviye] - SIRA[b.saglik.seviye] || a.unvan.localeCompare(b.unvan, "tr"));
  const secili = raporlar.find((r) => r.cariId === seciliId) || null;
  const seciliCari = secili ? cariler.find((c) => c.id === secili.cariId) : null;
  const bakiyeYaz = (r) => (Object.keys(r.alacak).length
    ? <span style={{ color: "var(--erp-primary)", fontWeight: 800 }}>{cariRaporParaListe(r.alacak)}</span>
    : Object.keys(r.verecek).length
      ? <span style={{ color: "var(--erp-danger)", fontWeight: 800 }}>−{cariRaporParaListe(r.verecek)}</span>
      : <span style={{ color: "var(--erp-text-3)" }}>0</span>);
  const sayilar = { riskli: raporlar.filter((r) => r.saglik.seviye === "riskli").length, takip: raporlar.filter((r) => r.saglik.seviye === "takip").length };
  const th = { padding: "6px 8px", fontSize: 11, textAlign: "left", color: "var(--erp-text-2)", borderBottom: "1px solid var(--erp-line)", whiteSpace: "nowrap" };
  const td = { padding: "7px 8px", fontSize: 13, borderBottom: "1px solid var(--erp-line-soft)", whiteSpace: "nowrap" };

  return (
    <div data-cari-raporlari="1">
      {secili && (
        <div data-cari-rapor-karti={secili.unvan} style={{ background: "var(--erp-panel)", border: `2px solid ${CARI_SAGLIK[secili.saglik.seviye].renk}`, borderRadius: "var(--erp-r-lg)", padding: 14, marginBottom: 14 }}>
          {/* RAPOR BAŞLIĞI: cari + o anki bakiye (alacak/verecek) + sağlık rozeti. */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 700 }}>{secili.tip}{secili.ulke ? ` · ${secili.ulke}` : ""}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{secili.unvan}</div>
              <div style={{ marginTop: 6 }}><CariSaglikRozeti seviye={secili.saglik.seviye} /></div>
            </div>
            <div data-cari-rapor-bakiye="1" style={{ textAlign: "right", flex: "0 1 auto" }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-3)", fontWeight: 700 }}>
                {Object.keys(secili.alacak).length ? "Alacağımız" : Object.keys(secili.verecek).length ? "Borcumuz" : "Bakiye"} · {cariRaporTarih(secili.bugun)}
              </div>
              <div className="mono" style={{ fontSize: 26 }}>{bakiyeYaz(secili)}</div>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setSeciliId(null)} title="Raporu kapat" style={{ padding: "4px 8px" }}><X size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, margin: "12px 0" }}>
            {[
              ["Sipariş", `${secili.toplam.siparisSayisi} (${secili.toplam.acikSiparis} açık)`],
              ["Sipariş adedi", secili.toplam.adet],
              ["Teslim edilen", secili.toplam.teslim],
              ["Kalan", secili.toplam.kalanAdet],
              ["Kalan teslim tutarı", cariRaporParaListe(secili.toplam.kalanTutar)],
              [`Siparişe bağlı ${secili.paraTipi.toLocaleLowerCase("tr-TR")}`, cariRaporParaListe(secili.toplam.odenen)],
              [`Son ${secili.paraTipi.toLocaleLowerCase("tr-TR")}`, secili.sonPara ? `${cariRaporTarih(secili.sonPara.tarih)} (${secili.sonParaGun} gün)` : "—"],
            ].map(([b, d]) => (
              <div key={b} style={{ background: "var(--erp-panel-2)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 700 }}>{b}</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 800 }}>{d}</div>
              </div>
            ))}
          </div>
          <div data-cari-rapor-nedenler="1" style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 10 }}>
            {secili.saglik.nedenler.map((n) => <div key={n}>• {n}</div>)}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Sipariş", "Tarih", "Durum", "Adet", "Teslim", "Kalan", "Tutar", secili.paraTipi, "Kalan tutar"].map((h, i) => <th key={h} style={{ ...th, textAlign: i >= 3 ? "right" : "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {secili.siparisler.length === 0 && <tr><td colSpan={9} style={{ ...td, color: "var(--erp-text-3)" }}>Sipariş yok</td></tr>}
                {secili.siparisler.map((x) => (
                  <tr key={x.id} data-cari-rapor-siparis={x.siparisNo} style={{ background: x.gecikti ? "var(--erp-orange-bg)" : undefined }}>
                    <td style={td}>
                      <button type="button" className="mono" onClick={() => onGoToSiparis && onGoToSiparis(x.id)}
                        style={{ background: "none", border: "none", padding: 0, color: "var(--erp-info)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>{x.siparisNo}</button>
                    </td>
                    <td style={td} className="mono">{cariRaporTarih(x.tarih)}</td>
                    <td style={td}>{x.durum}{x.gecikti ? <span style={{ color: "var(--erp-danger)", fontWeight: 700 }}> · gecikti</span> : null}</td>
                    <td style={{ ...td, textAlign: "right" }} className="mono">{x.adet}</td>
                    <td style={{ ...td, textAlign: "right" }} className="mono">{x.teslim}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800 }} className="mono">{x.kalanAdet}</td>
                    <td style={{ ...td, textAlign: "right" }} className="mono">{cariRaporParaListe(x.tutar)}</td>
                    <td style={{ ...td, textAlign: "right", color: "var(--erp-primary)" }} className="mono">{cariRaporParaListe(x.odenen)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800 }} className="mono">{x.odemeKalan != null ? cariRaporPara(x.odemeKalan, x.tekPB) : cariRaporParaListe(x.tutar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            <PaylasSeridi
              govdeHTML={cariRaporuHTML(secili, firmaBilgileri)}
              dosyaAdi={`Cari raporu - ${secili.unvan}`}
              cari={seciliCari}
              konu={`Cari raporu — ${secili.unvan}`}
              ozet={`${secili.unvan} — ${Object.keys(secili.alacak).length ? `alacağımız ${cariRaporParaListe(secili.alacak)}` : Object.keys(secili.verecek).length ? `borcumuz ${cariRaporParaListe(secili.verecek)}` : "bakiye 0"}; ${secili.toplam.acikSiparis} açık sipariş, ${secili.toplam.kalanAdet} adet kalan.`}
              showToast={showToast} firmaBilgileri={firmaBilgileri}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--erp-text-3)" }} />
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Cari ara…" data-cari-rapor-arama="1"
            style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: "var(--erp-r-md)", border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 14 }} />
        </div>
        {["Tümü", "Müşteri", "Tedarikçi"].map((t) => (
          <button key={t} type="button" onClick={() => setTipSec(t)}
            style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${tipSec === t ? "var(--erp-primary)" : "var(--erp-border)"}`, background: tipSec === t ? "#4E6B4E1A" : "#fff", color: tipSec === t ? "var(--erp-primary)" : "var(--erp-text-2)" }}>{t}</button>
        ))}
        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)", marginLeft: "auto" }}>
          {raporlar.length} cari · <span style={{ color: "var(--erp-danger)", fontWeight: 700 }}>{sayilar.riskli} riskli</span> · <span style={{ color: "var(--erp-warn)", fontWeight: 700 }}>{sayilar.takip} takip</span>
        </span>
      </div>

      <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Cari", "Durum", "Bakiye", "Açık sipariş", "Kalan adet", "Kalan teslim tutarı", "Son tahsilat/ödeme"].map((h, i) => <th key={h} style={{ ...th, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
          <tbody>
            {raporlar.length === 0 && <tr><td colSpan={7} style={{ ...td, color: "var(--erp-text-3)" }}>Cari yok</td></tr>}
            {raporlar.map((r) => (
              <tr key={r.cariId} data-cari-rapor-satir={r.unvan} onClick={() => setSeciliId(r.cariId === seciliId ? null : r.cariId)}
                style={{ cursor: "pointer", background: r.cariId === seciliId ? "var(--erp-hover)" : undefined }}>
                <td style={{ ...td, fontWeight: 700 }}>{r.unvan}<div style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 400 }}>{r.tip}</div></td>
                <td style={td}><CariSaglikRozeti seviye={r.saglik.seviye} kucuk /></td>
                <td style={{ ...td, textAlign: "right" }} className="mono">{bakiyeYaz(r)}</td>
                <td style={{ ...td, textAlign: "right" }} className="mono">{r.toplam.acikSiparis}{r.toplam.geciken ? <span style={{ color: "var(--erp-danger)" }}> ({r.toplam.geciken} gecikmiş)</span> : null}</td>
                <td style={{ ...td, textAlign: "right" }} className="mono">{r.toplam.kalanAdet}</td>
                <td style={{ ...td, textAlign: "right" }} className="mono">{cariRaporParaListe(r.toplam.kalanTutar)}</td>
                <td style={{ ...td, textAlign: "right" }} className="mono">{r.sonPara ? `${cariRaporTarih(r.sonPara.tarih)} · ${r.sonParaGun} gün` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 8 }}>
        Durum: <b>İyi</b> — alacak yok ya da son tahsilat {CARI_SAGLIK_TAKIP_GUN} gün içinde · <b>Takip</b> — {CARI_SAGLIK_TAKIP_GUN + 1}–{CARI_SAGLIK_RISK_GUN} gün (tedarikçide: {CARI_SAGLIK_RISK_GUN} günden uzun süredir ödenmemiş borcumuz) · <b>Riskli</b> — alacak var, {CARI_SAGLIK_RISK_GUN} günden uzun süredir tahsilat yok.
      </div>
    </div>
  );
}
