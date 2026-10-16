// ================= KASA & BANKA › TÜM HAREKETLER (v1.674.0) =================
//
// Kullanıcı: "Burada kasalar ve bankalar listelensin, yeni kasa açılsın. Hareketler listelensin topluca, kasa / banka
// ayrımı olarak, genel ve resmi şeklinde de ayrım, filtreleme vs." Hareket GİRİŞİ bu ekrandan kalktı (Ödeme &
// Tahsilat'ta); bu liste yalnız okuma. Defter kuralı ERP'nin geri kalanıyla aynı (`defterKapsar`: Muhasebe defteri
// hem Genel'de hem Resmi'de sayılır). Toplamlar para birimi başına — farklı birimleri toplamak yapılmamış kur
// çevrimi olurdu.

function KasaBankaHareketleri({ muhasebe, cariler }) {
  const [tur, setTur] = useState("Tümü");          // Tümü | Kasa | Banka
  const [hesapId, setHesapId] = useState("");
  const [defter, setDefter] = useState("Tümü");    // Tümü | Genel | Resmi
  const [yon, setYon] = useState("Tümü");          // Tümü | Giriş | Çıkış
  const [bas, setBas] = useState("");
  const [bit, setBit] = useState("");
  const [arama, setArama] = useState("");
  // BAŞLIK SÜZGEÇLERİ (v1.688.5 — kullanıcı: "Kasa & Banka listelerini de böyle yap"): raporlardaki gibi her sütunun altında
  // arama kutusu (245 `raporKolonAra`: metin içerir, tarih "gg.aa", tutar ">1000", "100-200").
  const [kolonAra, setKolonAra] = useState({});
  const KBH_ALANLAR = [
    { anahtar: "tarih", tip: "tarih" }, { anahtar: "hesap", tip: "metin" }, { anahtar: "karsi", tip: "metin" }, { anahtar: "aciklama", tip: "metin" },
    { anahtar: "defter", tip: "metin" }, { anahtar: "fisNo", tip: "metin" }, { anahtar: "giris", tip: "sayi" }, { anahtar: "cikis", tip: "sayi" }, { anahtar: "cevrilmis", tip: "metin" },
  ];

  const hesaplar = [
    ...((muhasebe && muhasebe.kasalar) || []).map((h) => ({ ...h, tur: "Kasa" })),
    ...((muhasebe && muhasebe.bankalar) || []).map((h) => ({ ...h, tur: "Banka" })),
  ];
  // ÇEVRİLMİŞ TUTARLAR (v1.678.0 — kullanıcı: "tüm hareketlerde de çevrilmiş tutar görünsün"). Kasa hareketinin
  // kendisi kasa biriminde; karşılığı: gelir/gider kartında karsi/resmi alanları, cariye bağlıda cari tutarı + cari
  // hareketinin Resmi tutarı (bağ `muhasebeBagId`).
  const cariHareketBag = React.useMemo(() => {
    const m = {};
    (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => { if (h.muhasebeBagId) m[h.muhasebeBagId] = h; }));
    return m;
  }, [cariler]);
  const cevrilmis = (x) => {
    const hpb = x.hesap.paraBirimi || "TRY";
    const yaz = (t, pb) => `${Number(t).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
    const parcalar = [];
    const ch = x.muhasebeBagId ? cariHareketBag[x.muhasebeBagId] : null;
    const genelPB = x.karsiPB || (ch && ch.paraBirimi) || (x.cariPB);
    const genelT = x.karsiPB ? x.karsiTutar : ch ? ch.tutar : x.cariTutar;
    if (genelPB && genelPB !== hpb && genelT != null) parcalar.push(["Genel", yaz(genelT, genelPB)]);
    const resmiPB = x.resmiPB || (ch && ch.resmiPB);
    const resmiT = x.resmiPB ? x.resmiTutar : ch ? ch.resmiTutar : null;
    if (resmiPB && resmiT != null) parcalar.push(["Resmi", yaz(resmiT, resmiPB)]);
    return parcalar;
  };
  const cariAd = (id) => { const c = (cariler || []).find((x) => x.id === id); return c ? c.unvan : ""; };
  const q = arama.trim().toLocaleLowerCase("tr-TR");

  const satirlar = React.useMemo(() => hesaplar
    .filter((h) => (tur === "Tümü" || h.tur === tur) && (!hesapId || h.id === hesapId))
    .flatMap((h) => (h.hareketler || []).map((x) => ({ ...x, hesap: h })))
    .filter((x) => defter === "Tümü" || defterKapsar(x.defter, defter))
    .filter((x) => yon === "Tümü" || x.yon === yon)
    .filter((x) => { const t = String(x.tarih || "").slice(0, 10); return (!bas || t >= bas) && (!bit || t <= bit); })
    .filter((x) => !q || `${x.aciklama || ""} ${x.fisNo || ""} ${cariAd(x.cariId)} ${x.giderKartAd || ""} ${x.hesap.ad}`.toLocaleLowerCase("tr-TR").includes(q))
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || ""))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [muhasebe, cariler, tur, hesapId, defter, yon, bas, bit, q]);

  const kolonSuzgecVar = Object.values(kolonAra).some((v) => String(v || "").trim());
  const gorunen = !kolonSuzgecVar ? satirlar : (() => {
    const gecen = new Set(raporKolonAra(satirlar.map((x, i) => ({
      __i: i, tarih: String(x.tarih || "").slice(0, 10), hesap: `${x.hesap.tur} ${x.hesap.ad}`,
      karsi: x.cariId ? cariAd(x.cariId) : x.giderKartAd || (x.virmanMi ? "virman" : ""), aciklama: x.aciklama || "",
      defter: x.defter || "Genel", fisNo: x.fisNo || "", giris: x.yon === "Giriş" ? Number(x.tutar) || 0 : null,
      cikis: x.yon !== "Giriş" ? Number(x.tutar) || 0 : null, cevrilmis: cevrilmis(x).map(([d, t]) => `${d} ${t}`).join(" "),
    })), KBH_ALANLAR, kolonAra).map((r) => r.__i));
    return satirlar.filter((_, i) => gecen.has(i));
  })();
  const toplam = {};
  gorunen.forEach((x) => {
    const pb = x.hesap.paraBirimi || "TRY";
    toplam[pb] = toplam[pb] || { giris: 0, cikis: 0 };
    if (x.yon === "Giriş") toplam[pb].giris += Number(x.tutar) || 0; else toplam[pb].cikis += Number(x.tutar) || 0;
  });
  const para = (t, pb) => `${t.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
  const cip = (deger, set, secenekler, veri) => (
    <div style={{ display: "flex", gap: 4 }}>
      {secenekler.map((s) => (
        <button key={s} type="button" data-kbh-cip={`${veri}:${s}`} onClick={() => set(s)}
          className={deger === s ? "btn-primary" : "btn-ghost"} style={{ fontSize: 12, padding: "4px 10px" }}>{s}</button>
      ))}
    </div>
  );
  const kutu = { border: "1.5px solid var(--hrk-renk)", borderRadius: 10, padding: 10, background: "#fff", marginBottom: 10 };

  return (
    <div data-kasa-banka-hareketleri="1">
      <div style={{ ...kutu, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {cip(tur, (v) => { setTur(v); setHesapId(""); }, ["Tümü", "Kasa", "Banka"], "tur")}
        <select value={hesapId} onChange={(e) => setHesapId(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">Tüm hesaplar</option>
          {hesaplar.filter((h) => tur === "Tümü" || h.tur === tur).map((h) => <option key={h.id} value={h.id}>{h.tur}: {h.ad} · {h.paraBirimi || "TRY"}</option>)}
        </select>
        {cip(defter, setDefter, ["Tümü", "Genel", "Resmi"], "defter")}
        {cip(yon, setYon, ["Tümü", "Giriş", "Çıkış"], "yon")}
        <input type="date" value={bas} onChange={(e) => setBas(e.target.value)} title="Başlangıç" />
        <input type="date" value={bit} onChange={(e) => setBit(e.target.value)} title="Bitiş" />
        <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Açıklama, cari, fiş no ara…" style={{ flex: "1 1 200px" }} />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 8 }} data-kbh-toplam="1">
        <b>{kolonSuzgecVar ? `${gorunen.length} / ` : ""}{satirlar.length} hareket</b>
        {Object.entries(toplam).map(([pb, t]) => (
          <span key={pb} className="mono">
            <span style={{ color: HAREKET_TIPI_RENK["Tahsilat"] }}>+{para(t.giris, pb)}</span>{"  "}
            <span style={{ color: HAREKET_TIPI_RENK["Ödeme"] }}>−{para(t.cikis, pb)}</span>{"  "}
            <b>= {para(t.giris - t.cikis, pb)}</b>
          </span>
        ))}
      </div>
      <div data-kbh-kutu="1" style={{ overflow: "auto", maxHeight: "65vh", border: "1.5px solid var(--erp-line)", borderRadius: 8, background: "#fff" }}>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 0 var(--erp-line)" }}>
            <tr style={{ textAlign: "left", color: "var(--erp-text-2)", fontSize: 11 }}>
              <th style={{ padding: 6 }}>Tarih</th><th style={{ padding: 6 }}>Hesap</th><th style={{ padding: 6 }}>Karşı taraf</th>
              <th style={{ padding: 6 }}>Açıklama</th><th style={{ padding: 6 }}>Defter</th><th style={{ padding: 6 }}>Fiş</th>
              <th style={{ padding: 6, textAlign: "right" }}>Giriş</th><th style={{ padding: 6, textAlign: "right" }}>Çıkış</th>
              <th style={{ padding: 6 }}>Çevrilmiş</th>
            </tr>
            <tr>{KBH_ALANLAR.map((a) => (
              <th key={a.anahtar} style={{ padding: "0 4px 5px" }}>
                <input data-kbh-kolon-ara={a.anahtar} value={kolonAra[a.anahtar] || ""} onChange={(e) => setKolonAra((o) => ({ ...o, [a.anahtar]: e.target.value }))}
                  placeholder={a.tip === "sayi" ? ">0" : a.tip === "tarih" ? "gg.aa" : "ara…"}
                  style={{ width: "100%", minWidth: 50, boxSizing: "border-box", fontSize: 11, padding: "3px 5px", border: "1px solid var(--erp-line)", borderRadius: 4, fontWeight: 400, textAlign: a.tip === "sayi" ? "right" : "left" }} />
              </th>
            ))}</tr>
          </thead>
          <tbody>{gorunen.map((x) => {
            const pb = x.hesap.paraBirimi || "TRY";
            return (
              <tr key={`${x.hesap.id}|${x.id}`} data-kbh-satir="1" style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                <td className="mono" style={{ padding: 6, whiteSpace: "nowrap" }}>{tarihYaz(String(x.tarih || "").slice(0, 10))}</td>
                <td style={{ padding: 6, whiteSpace: "nowrap" }}><span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{x.hesap.tur}</span> {x.hesap.ad}</td>
                <td style={{ padding: 6 }}>{x.cariId ? cariAd(x.cariId) : x.giderKartAd ? <i>{x.giderKartAd}</i> : x.virmanMi ? "virman" : "—"}</td>
                <td style={{ padding: 6, color: "var(--erp-text-2)" }}>{x.aciklama}</td>
                <td style={{ padding: 6 }}>{x.defter || "Genel"}</td>
                <td className="mono" style={{ padding: 6, whiteSpace: "nowrap" }}>{x.fisNo || ""}</td>
                <td className="mono" style={{ padding: 6, textAlign: "right", color: HAREKET_TIPI_RENK["Tahsilat"] }}>{x.yon === "Giriş" ? para(Number(x.tutar) || 0, pb) : ""}</td>
                <td className="mono" style={{ padding: 6, textAlign: "right", color: HAREKET_TIPI_RENK["Ödeme"] }}>{x.yon !== "Giriş" ? para(Number(x.tutar) || 0, pb) : ""}</td>
                <td data-kbh-cevrilmis="1" className="mono" style={{ padding: 6, fontSize: 11, whiteSpace: "nowrap" }}>
                  {cevrilmis(x).map(([d, t]) => <div key={d}><span style={{ color: d === "Resmi" ? "var(--erp-info)" : "var(--erp-text-2)" }}>{d}:</span> <b>{t}</b></div>)}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        {gorunen.length === 0 && <EmptyState text="Süzgece uyan hareket yok." />}
      </div>
    </div>
  );
}
