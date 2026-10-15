// Günlük ekranı. Kayıtlar buluttan TALEP ÜZERİNE çekiliyor, açılışta değil: günlük hızla
// büyüyen tek tablo ve her açılışta indirmek uygulamayı yavaşlatırdı.
function GunlukPaneli({ showToast }) {
  const [kayitlar, setKayitlar] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [arama, setArama] = useState("");
  const [kapsamSuzgec, setKapsamSuzgec] = useState("");
  const [gorunum, setGorunum] = useState("matris"); // "matris" | "akis" | "mesai"
  // OKUNAKLI GÜNLÜK (v1.673.0 — kullanıcı: "log takibi var ama detaylı değil; matris şeklinde ve okunaklı olsun").
  // Süzgeçler üç görünümde ortak: tarih aralığı + kullanıcı + modül. Matris hücresine tıklamak akışı o kesişimle açar.
  const [gunAraligi, setGunAraligi] = useState(7);
  const [kullaniciSuzgec, setKullaniciSuzgec] = useState("");

  const yukle = async () => {
    setYukleniyor(true);
    try {
      setKayitlar(await gunlukOku(1000));
    } catch (e) {
      showToast("Günlük okunamadı: " + String((e && e.message) || e));
      setKayitlar([]);
    } finally {
      setYukleniyor(false);
    }
  };
  useEffect(() => { yukle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const KAPSAM_RENK = {
    oturum: "var(--erp-purple)", stok: "var(--erp-brown)", siparis: "var(--erp-info)",
    uretim: "var(--erp-primary)", cari: "var(--erp-warn)", veri: "var(--erp-text-3)",
  };

  const KAPSAM_AD = { oturum: "Oturum", stok: "Stok", siparis: "Sipariş", uretim: "Üretim", cari: "Cari", veri: "Veri", muhasebe: "Kasa/Banka", fis: "Fiş", tanimlar: "Tanımlar" };
  const kapsamAd = (k) => KAPSAM_AD[k] || (k ? k.charAt(0).toLocaleUpperCase("tr-TR") + k.slice(1) : "Diğer");
  const sinir = gunAraligi ? Date.now() - gunAraligi * 86400000 : 0;
  const aralikta = (kayitlar || []).filter((k) => (!sinir || (k.zaman && new Date(k.zaman).getTime() >= sinir))
    && (!kullaniciSuzgec || (k.kullanici_ad || "Bilinmeyen") === kullaniciSuzgec));
  const kullanicilar = Array.from(new Set((kayitlar || []).map((k) => k.kullanici_ad || "Bilinmeyen"))).sort((a, b) => a.localeCompare(b, "tr"));
  // MATRİS: satır kullanıcı, sütun modül, hücre işlem sayısı; ikinci tablo gün × kullanıcı.
  const matris = (() => {
    const kul = {}; const kapsamSet = new Set(); const gunler = {};
    aralikta.forEach((k) => {
      const ad = k.kullanici_ad || "Bilinmeyen"; const kp = k.kapsam || "diger";
      kapsamSet.add(kp);
      kul[ad] = kul[ad] || { toplam: 0 }; kul[ad][kp] = (kul[ad][kp] || 0) + 1; kul[ad].toplam++;
      const g = k.zaman ? k.zaman.slice(0, 10) : "—";
      gunler[g] = gunler[g] || { toplam: 0 }; gunler[g][ad] = (gunler[g][ad] || 0) + 1; gunler[g].toplam++;
    });
    return { kul, kapsamlar: [...kapsamSet].sort(), gunler: Object.entries(gunler).sort((a, b) => (a[0] < b[0] ? 1 : -1)) };
  })();

  const suzulmus = aralikta.filter((k) => {
    if (kapsamSuzgec && (k.kapsam || "diger") !== kapsamSuzgec) return false;
    if (!arama.trim()) return true;
    const t = arama.trim().toLocaleLowerCase("tr-TR");
    return `${k.kullanici_ad || ""} ${k.eylem || ""} ${JSON.stringify(k.ayrinti || {})}`
      .toLocaleLowerCase("tr-TR").includes(t);
  });

  const kapsamlar = Array.from(new Set((kayitlar || []).map((k) => k.kapsam).filter(Boolean)));

  // ---- MESAİ / AKTİVİTE ----
  // Kullanıcı × gün kırılımında ilk hareket, son hareket ve aradaki süre.
  //
  // DÜRÜSTLÜK NOTU: bu bir PUANTAJ DEĞİLDİR. Ölçtüğü şey "işe geliş-gidiş saati" değil,
  // "uygulamada ilk ve son işlem". Atölyede olup uygulamaya dokunmayan biri burada görünmez;
  // akşam evden tek kayıt giren birinin aralığı olduğundan uzun çıkar. Ücret hesabına temel
  // yapılırsa haksızlık üretir — kaba bir etkinlik göstergesi olarak okunmalı.
  const mesai = (() => {
    const kova = {};
    (kayitlar || []).forEach((k) => {
      if (!k.zaman) return;
      const t = new Date(k.zaman);
      const gun = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      const ad = k.kullanici_ad || "Bilinmeyen";
      const anahtar = `${gun}|${ad}`;
      if (!kova[anahtar]) kova[anahtar] = { gun, ad, ilk: t, son: t, adet: 0, kapsamlar: {} };
      const g = kova[anahtar];
      if (t < g.ilk) g.ilk = t;
      if (t > g.son) g.son = t;
      g.adet++;
      if (k.kapsam) g.kapsamlar[k.kapsam] = (g.kapsamlar[k.kapsam] || 0) + 1;
    });
    return Object.values(kova).sort((a, b) => (a.gun < b.gun ? 1 : a.gun > b.gun ? -1 : a.ad.localeCompare(b.ad, "tr")));
  })();

  const sureMetni = (ms) => {
    const dk = Math.round(ms / 60000);
    if (dk < 60) return `${dk} dk`;
    return `${Math.floor(dk / 60)} sa ${String(dk % 60).padStart(2, "0")} dk`;
  };
  const saatMetni = (t) => `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)" }}>Günlük</div>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
          Kim ne yaptı — son 500 kayıt. Bu kayıtlar değiştirilemez ve silinemez.
        </span>
        <button type="button" className="btn-ghost" style={{ marginLeft: "auto", fontSize: 12, padding: "5px 10px" }} onClick={yukle}>
          <RefreshCw size={12} /> Yenile
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[{ k: "matris", ad: "Matris" }, { k: "akis", ad: "Akış (tablo)" }, { k: "mesai", ad: "Mesai / Aktivite" }].map((g) => (
          <button
            key={g.k}
            type="button"
            onClick={() => setGorunum(g.k)}
            style={{
              padding: "5px 14px", fontSize: 12, fontWeight: 700, borderRadius: "var(--erp-r-pill)", cursor: "pointer",
              border: `1.5px solid ${gorunum === g.k ? "#7A5C8A" : "var(--erp-border)"}`,
              background: gorunum === g.k ? "#7A5C8A18" : "transparent",
              color: gorunum === g.k ? "#7A5C8A" : "var(--erp-text-2)", fontFamily: "inherit",
            }}
          >
            {g.ad}
          </button>
        ))}
      </div>

      <div data-gunluk-suzgec="1" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[[1, "Bugün"], [7, "7 gün"], [30, "30 gün"], [0, "Tümü"]].map(([g, ad]) => (
          <button key={g} type="button" data-gunluk-aralik={g} className={gunAraligi === g ? "btn-primary" : "btn-ghost"} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setGunAraligi(g)}>{ad}</button>
        ))}
        <select value={kullaniciSuzgec} onChange={(e) => setKullaniciSuzgec(e.target.value)} style={{ ...inputStyle, width: 170, fontSize: 12 }}>
          <option value="">Tüm kullanıcılar</option>
          {kullanicilar.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{aralikta.length} işlem</span>
      </div>

      {gorunum === "matris" && !yukleniyor && (
        <div data-gunluk-matris="1" style={{ display: "grid", gap: 14 }}>
          {aralikta.length === 0 ? <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: 12 }}>Bu aralıkta kayıt yok.</div> : (<>
          <div style={{ overflowX: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Kullanıcı × modül (işlem sayısı) — hücreye tıklayınca o işlemler listelenir</div>
            <table style={{ borderCollapse: "collapse", fontSize: 13, background: "#fff", minWidth: 400 }}>
              <thead><tr>
                <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "2px solid var(--erp-line)" }}>Kullanıcı</th>
                {matris.kapsamlar.map((kp) => <th key={kp} style={{ padding: "6px 10px", borderBottom: "2px solid var(--erp-line)", color: KAPSAM_RENK[kp] || "var(--erp-text-2)" }}>{kapsamAd(kp)}</th>)}
                <th style={{ padding: "6px 10px", borderBottom: "2px solid var(--erp-line)" }}>Toplam</th>
              </tr></thead>
              <tbody>{Object.entries(matris.kul).sort((a, b) => b[1].toplam - a[1].toplam).map(([ad, r]) => {
                const enCok = Math.max(...matris.kapsamlar.map((kp) => r[kp] || 0));
                return (
                  <tr key={ad} data-gunluk-matris-satir={ad}>
                    <td style={{ padding: "6px 10px", fontWeight: 700, borderBottom: "1px solid var(--erp-line-soft)" }}>{ad}</td>
                    {matris.kapsamlar.map((kp) => {
                      const n = r[kp] || 0; const renk = KAPSAM_RENK[kp] || "#7A5C8A";
                      return (
                        <td key={kp} onClick={() => { if (!n) return; setKullaniciSuzgec(ad); setKapsamSuzgec(kp); setGorunum("akis"); }}
                          className="mono" style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid var(--erp-line-soft)", cursor: n ? "pointer" : "default",
                            background: n ? alfaEkle(renk, n === enCok ? "33" : "14") : undefined, fontWeight: n === enCok && n ? 800 : 400, color: n ? "var(--erp-text)" : "var(--erp-text-3)" }}>
                          {n || "·"}
                        </td>
                      );
                    })}
                    <td className="mono" style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, borderBottom: "1px solid var(--erp-line-soft)" }}>{r.toplam}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Gün × kullanıcı</div>
            <table style={{ borderCollapse: "collapse", fontSize: 13, background: "#fff", minWidth: 300 }}>
              <thead><tr>
                <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "2px solid var(--erp-line)" }}>Gün</th>
                {Object.keys(matris.kul).map((ad) => <th key={ad} style={{ padding: "6px 10px", borderBottom: "2px solid var(--erp-line)" }}>{ad}</th>)}
                <th style={{ padding: "6px 10px", borderBottom: "2px solid var(--erp-line)" }}>Toplam</th>
              </tr></thead>
              <tbody>{matris.gunler.map(([g, r]) => (
                <tr key={g}>
                  <td className="mono" style={{ padding: "6px 10px", borderBottom: "1px solid var(--erp-line-soft)", whiteSpace: "nowrap" }}>{g === "—" ? g : tarihYaz(g)}</td>
                  {Object.keys(matris.kul).map((ad) => (
                    <td key={ad} className="mono" style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid var(--erp-line-soft)", color: r[ad] ? "var(--erp-text)" : "var(--erp-text-3)" }}>{r[ad] || "·"}</td>
                  ))}
                  <td className="mono" style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, borderBottom: "1px solid var(--erp-line-soft)" }}>{r.toplam}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          </>)}
        </div>
      )}

      {gorunum === "mesai" && !yukleniyor && (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "7px 10px", lineHeight: 1.6 }}>
            <b>Bu bir puantaj değildir.</b> Gösterdiği şey işe geliş-gidiş saati değil, uygulamadaki
            ilk ve son işlem. Atölyede olup uygulamaya dokunmayan burada görünmez; akşam evden tek
            kayıt giren birinin aralığı olduğundan uzun çıkar. Kaba bir etkinlik göstergesi olarak okuyun.
          </div>
          {mesai.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: 12 }}>Kayıt yok.</div>}
          {mesai.map((m) => (
            <div key={`${m.gun}|${m.ad}`} style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              background: "#fff", border: "1px solid var(--erp-line-soft)", borderLeft: "3px solid #7A5C8A",
              borderRadius: "var(--erp-r-md)", padding: "7px 10px",
            }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", whiteSpace: "nowrap" }}>{m.gun}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", minWidth: 90 }}>{m.ad}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text)", whiteSpace: "nowrap" }}>
                {saatMetni(m.ilk)} – {saatMetni(m.son)}
              </span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#7A5C8A", whiteSpace: "nowrap" }}>
                {sureMetni(m.son - m.ilk)}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                {m.adet} işlem
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", marginLeft: "auto" }}>
                {Object.entries(m.kapsamlar).map(([k, v]) => `${k}:${v}`).join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {gorunum === "akis" && (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="kullanıcı, eylem veya ayrıntı ara…"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={kapsamSuzgec} onChange={(e) => setKapsamSuzgec(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Tüm kapsamlar</option>
          {kapsamlar.map((k) => <option key={k} value={k}>{kapsamAd(k)}</option>)}
        </select>
      </div>
      )}

      {yukleniyor && <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: 12 }}>Yükleniyor…</div>}

      {!yukleniyor && kayitlar && kayitlar.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: 12, background: "var(--erp-panel)", borderRadius: "var(--erp-r-md)" }}>
          Henüz kayıt yok. Günlük tablosu oluşturulmadıysa <b className="mono">gunluk-tablosu.sql</b> çalıştırılmalı.
        </div>
      )}

      {gorunum === "akis" && !yukleniyor && suzulmus.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table data-gunluk-akis="1" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff" }}>
            <thead><tr style={{ textAlign: "left", color: "var(--erp-text-2)", fontSize: 11, textTransform: "uppercase" }}>
              <th style={{ padding: "6px 8px", borderBottom: "2px solid var(--erp-line)" }}>Zaman</th>
              <th style={{ padding: "6px 8px", borderBottom: "2px solid var(--erp-line)" }}>Kullanıcı</th>
              <th style={{ padding: "6px 8px", borderBottom: "2px solid var(--erp-line)" }}>Modül</th>
              <th style={{ padding: "6px 8px", borderBottom: "2px solid var(--erp-line)" }}>İşlem</th>
              <th style={{ padding: "6px 8px", borderBottom: "2px solid var(--erp-line)" }}>Ayrıntı</th>
            </tr></thead>
            <tbody>{suzulmus.map((k) => {
              const renk = KAPSAM_RENK[k.kapsam] || "var(--erp-text-2)";
              const ayrintilar = k.ayrinti ? Object.entries(k.ayrinti).filter(([, v]) => v !== null && v !== "" && v !== 0) : [];
              return (
                <tr key={k.id} style={{ borderLeft: `3px solid ${renk}` }}>
                  <td className="mono" style={{ padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)", whiteSpace: "nowrap", fontSize: 12, color: "var(--erp-text-2)" }}>
                    {k.zaman ? new Date(k.zaman).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)", fontWeight: 700, whiteSpace: "nowrap" }}>{k.kullanici_ad || "Bilinmeyen"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: renk, background: alfaEkle(renk, "18"), borderRadius: "var(--erp-r-pill)", padding: "2px 8px" }}>{kapsamAd(k.kapsam)}</span></td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)" }}>{k.eylem}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)", fontSize: 11, color: "var(--erp-text-2)" }}>
                    {ayrintilar.map(([a2, v]) => (
                      <span key={a2} style={{ display: "inline-block", marginRight: 8 }}><b>{a2}</b>: {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    ))}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {!yukleniyor && kayitlar && kayitlar.length > 0 && suzulmus.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: 12 }}>Süzgece uyan kayıt yok.</div>
      )}
    </div>
  );
}


/* =============================================================================================
   VERİ TUTARLILIK DENETİMİ
   ---------------------------------------------------------------------------------------------
   Denetleyici zinciri (kontrol.sh) KODU denetler: bir kuralın kodda uygulanıp uygulanmadığına
   bakar. Ama kod düzeldiğinde ESKİ VERİ düzelmez. Bu proje boyunca aynı hata sınıfı altı kez
   döndü ve her seferinde ortaya çıkma biçimi aynıydı: bir yazıcı/silici güncellendi, diğeri
   güncellenmedi, arada bozuk kayıtlar birikti — ve kimse fark etmedi çünkü bozukluğu görecek
   bir yer yoktu.

   Bu motor VERİYİ denetler. Kodun doğruluğuna değil, kayıtların birbirini tutup tutmadığına
   bakar. İki işi var:
     1. Geçmişte bozulmuş kayıtları bulup göstermek,
     2. Yeniden yapılandırma (tek kapı: fisYaz/fisGeriAl) sırasında güvenlik ağı olmak —
        bir şey bozulursa hemen söyler.

   TASARIM KURALI: her bulgu SOMUT olmalı — hangi kayıt, ne bekleniyordu, ne bulundu. "Tutarsızlık
   var" demek, kullanıcıyı 31 bin satırlık veride arama yapmaya mahkûm etmek olurdu.
