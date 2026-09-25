// ================= MAMUL DEPOSU =================
//
// Kullanıcı: "Depoyu mamul ve hammadde olarak ayıralım, hatta depo mantığını burada kurgulayalım."
//
// DEPO NEDİR, İKİ AYRI SORU SORAR:
//   Hammadde deposu → "üretebilmek için ne almalıyım?"  (talep reçeteden, arz satın almadan)
//   Mamul deposu    → "sevk edebilmek için ne üretmeliyim?" (talep satış siparişinden, arz üretimden)
// İkisi aynı ekranda karışınca, bakan kişi hangi soruya cevap aradığını unutuyordu. Ayrıldı.
//
// MAMUL DEPOSUNDA BİR ÇİFTİN GEÇEBİLECEĞİ HALLER:
//   stok      → depoda duran (ürün varyantının miktarı)
//   kolide    → fiziken depoda ama HAZIR bir koliye konmuş; başkasına satılamaz
//   serbest   → stok − kolide
//   üretimde  → henüz stoğa girmemiş, üretimi süren
//   talep     → satış siparişlerinde karşılanmamış kalan
//   açık      → talep − serbest − üretimde  (pozitifse ÜRETİLMESİ gereken)
//
// "Kolide" ayrı tutuluyor çünkü o mal fiziken orada ama SÖZÜ VERİLMİŞ. Serbest saymak, aynı çifti
// iki müşteriye satmaya yol açardı — koli sınır denetiminde (v1.87.0) aynı hata yaşanmıştı.
function mamulDeposuDurumu(stok, siparisler, uretim, koliler) {
  const satirlar = [];
  const anahtarla = (urunId, renk) => `${urunId}|${renk}`;

  (stok || []).filter((u) => u.kategori === "Mamul" && !u.pasif).forEach((u) => {
    (u.variants || []).forEach((v) => {
      const a = anahtarla(u.id, v.renk);
      let satir = satirlar.find((x) => x.anahtar === a);
      if (!satir) {
        satir = {
          anahtar: a, urunId: u.id, urunAd: u.ad, renk: v.renk, birim: u.birim || "çift",
          gorsel: (u.renkResimleri || {})[v.renk] || u.kapakResmi || "",
          hucreler: {},
        };
        satirlar.push(satir);
      }
      satir.hucreler[v.beden] = { stok: v.miktar || 0, kolide: 0, uretimde: 0, talep: 0 };
    });
  });

  const hucre = (urunId, renk, beden) => {
    const satir = satirlar.find((x) => x.anahtar === anahtarla(urunId, renk));
    if (!satir) return null;
    if (!satir.hucreler[beden]) satir.hucreler[beden] = { stok: 0, kolide: 0, uretimde: 0, talep: 0 };
    return satir.hucreler[beden];
  };

  // TALEP: satış siparişlerinde karşılanmamış kalan.
  (siparisler || []).forEach((sp) => {
    if (sp.tip !== "Satış" || sp.durum === "İptal") return;
    (sp.kalemler || []).forEach((k) => {
      const kalan = (k.miktar || 0) - (k.karsilanan || 0);
      if (kalan <= 0) return;
      const h = hucre(k.urunId, k.renk, k.beden);
      if (h) h.talep += kalan;
    });
  });

  // KOLİDE: yalnızca HAZIR koliler. Sevk edilmiş koli zaten stoktan düşmüştür.
  (koliler || []).forEach((ko) => {
    if ((ko.durum || "Hazır") !== "Hazır") return;
    (ko.kalemler || []).forEach((k) => {
      const h = hucre(k.urunId, k.renk, k.beden);
      if (h) h.kolide += k.adet || 0;
    });
  });

  // ÜRETİMDE: stoğa henüz eklenmemiş üretimler.
  (uretim || []).forEach((o) => {
    if (o.stogaEklendiMi) return;
    const bedenler = (o.bedenMiktarlari || []).length
      ? o.bedenMiktarlari
      : [{ beden: o.beden || "", miktar: o.adet || 0 }];
    bedenler.forEach((b) => {
      const h = hucre(o.urunId, o.renk, b.beden);
      if (h) h.uretimde += b.miktar || 0;
    });
  });

  satirlar.forEach((satir) => {
    satir.toplam = { stok: 0, kolide: 0, serbest: 0, uretimde: 0, talep: 0, acik: 0 };
    Object.values(satir.hucreler).forEach((h) => {
      h.serbest = stokYuvarla(h.stok - h.kolide);
      h.acik = Math.max(0, stokYuvarla(h.talep - h.serbest - h.uretimde));
      satir.toplam.stok += h.stok;
      satir.toplam.kolide += h.kolide;
      satir.toplam.serbest += h.serbest;
      satir.toplam.uretimde += h.uretimde;
      satir.toplam.talep += h.talep;
      satir.toplam.acik += h.acik;
    });
  });

  // Açığı olan satırlar üste: depoya bakan kişinin ilk sorusu "ne eksik".
  satirlar.sort((a, b) => (b.toplam.acik > 0) - (a.toplam.acik > 0)
    || a.urunAd.localeCompare(b.urunAd, "tr"));
  return satirlar;
}

function MamulDeposu({ stok, siparisler, uretim, koliler, onGoToUrun }) {
  const [suzgec, setSuzgec] = useState("tumu");   // "tumu" | "acik" | "stokta"
  const [ara, setAra] = useState("");

  const tumSatirlar = mamulDeposuDurumu(stok, siparisler, uretim, koliler);
  const satirlar = tumSatirlar.filter((s) => {
    if (suzgec === "acik" && s.toplam.acik <= 0) return false;
    if (suzgec === "stokta" && s.toplam.stok <= 0) return false;
    if (ara.trim()) {
      const q = ara.toLocaleLowerCase("tr-TR");
      if (!`${s.urunAd} ${s.renk}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    }
    return true;
  });

  const genelToplam = tumSatirlar.reduce((t, s) => ({
    stok: t.stok + s.toplam.stok, kolide: t.kolide + s.toplam.kolide,
    talep: t.talep + s.toplam.talep, acik: t.acik + s.toplam.acik,
    uretimde: t.uretimde + s.toplam.uretimde,
  }), { stok: 0, kolide: 0, talep: 0, acik: 0, uretimde: 0 });

  const suzgecler = [
    { key: "tumu", ad: "Tümü" },
    { key: "acik", ad: "Açığı olanlar" },
    { key: "stokta", ad: "Stokta olanlar" },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px", lineHeight: 1.6 }}>
        Mamul deposu <b>"sevk edebilmek için ne üretmeliyim?"</b> sorusunu cevaplar.
        Talep satış siparişlerinden, arz üretimden gelir. <b>Kolide</b> olan mal fiziken depodadır
        ama bir koliye konmuştur — serbest sayılmaz.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Model ya da renk ara…"
          style={{ ...inputStyle, maxWidth: 240 }}
        />
        {suzgecler.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setSuzgec(f.key)}
            style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
              border: `1px solid ${suzgec === f.key ? "#5A6B4E" : "var(--erp-border)"}`,
              background: suzgec === f.key ? "#5A6B4E" : "#fff",
              color: suzgec === f.key ? "#fff" : "var(--erp-text-2)",
            }}
          >
            {f.ad}
          </button>
        ))}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--erp-text-2)" }}>
          stok <b>{genelToplam.stok}</b> · kolide <b>{genelToplam.kolide}</b> ·
          {" "}üretimde <b>{genelToplam.uretimde}</b> · talep <b>{genelToplam.talep}</b> ·
          {" "}açık <b style={{ color: genelToplam.acik > 0 ? "#6B3FA0" : "var(--erp-primary)" }}>{genelToplam.acik}</b>
        </span>
      </div>

      {satirlar.length === 0 ? (
        <EmptyState mesaj="Bu filtrede mamul yok." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {satirlar.map((s) => {
            const bedenler = Object.keys(s.hucreler)
              .sort((a, b) => String(a).localeCompare(String(b), "tr", { numeric: true }));
            return (
              <div key={s.anahtar} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  {s.gorsel
                    ? <img src={s.gorsel} alt="" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid var(--erp-line-soft)" }} />
                    : <span style={{ width: 26, height: 26, borderRadius: "var(--erp-r-sm)", background: "var(--erp-head)" }} />}
                  <button
                    type="button"
                    onClick={() => onGoToUrun && onGoToUrun(s.urunId)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}
                    title="Ürün kartını aç"
                  >
                    {s.urunAd}
                  </button>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text-2)" }}>{s.renk}</span>
                  {s.toplam.acik > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6B3FA0", background: "#6B3FA014", border: "1px solid #6B3FA033", borderRadius: "var(--erp-r-pill)", padding: "1px 8px" }}>
                      {s.toplam.acik} üretilmeli
                    </span>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", minWidth: 360 }}>
                    <thead>
                      <tr style={{ background: "var(--erp-panel)" }}>
                        <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px" }}></th>
                        {bedenler.map((b) => (
                          <th key={b} className="mono" style={{ fontSize: 10, padding: "3px 8px" }}>{b || "—"}</th>
                        ))}
                        <th className="mono" style={{ fontSize: 10, padding: "3px 8px", borderLeft: "1px dashed var(--erp-line)" }}>Top.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { ad: "Stok", alan: "stok", renk: "var(--erp-text)" },
                        { ad: "Kolide", alan: "kolide", renk: "var(--erp-brown)" },
                        { ad: "Serbest", alan: "serbest", renk: "var(--erp-primary)" },
                        { ad: "Üretimde", alan: "uretimde", renk: "var(--erp-info)" },
                        { ad: "Talep", alan: "talep", renk: "var(--erp-text-2)" },
                        { ad: "Açık", alan: "acik", renk: "#6B3FA0" },
                      ].map((satirTipi) => (
                        <tr key={satirTipi.alan} style={{ borderTop: "1px solid var(--erp-head)" }}>
                          <td style={{ fontSize: 11, padding: "3px 8px", color: satirTipi.renk, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {satirTipi.ad}
                          </td>
                          {bedenler.map((b) => {
                            const deger = (s.hucreler[b] || {})[satirTipi.alan] || 0;
                            return (
                              <td key={b} className="mono" style={{
                                fontSize: 12, padding: "3px 8px", textAlign: "center",
                                color: deger ? satirTipi.renk : "var(--erp-border)",
                                fontWeight: deger ? 700 : 400,
                              }}>
                                {deger || "·"}
                              </td>
                            );
                          })}
                          <td className="mono" style={{ fontSize: 12, padding: "3px 8px", textAlign: "center", fontWeight: 700, color: satirTipi.renk, borderLeft: "1px dashed var(--erp-line)" }}>
                            {s.toplam[satirTipi.alan] || "·"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
