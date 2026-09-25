// Günlük ekranı. Kayıtlar buluttan TALEP ÜZERİNE çekiliyor, açılışta değil: günlük hızla
// büyüyen tek tablo ve her açılışta indirmek uygulamayı yavaşlatırdı.
function GunlukPaneli({ showToast }) {
  const [kayitlar, setKayitlar] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [arama, setArama] = useState("");
  const [kapsamSuzgec, setKapsamSuzgec] = useState("");
  const [gorunum, setGorunum] = useState("akis"); // "akis" | "mesai"

  const yukle = async () => {
    setYukleniyor(true);
    try {
      setKayitlar(await gunlukOku(500));
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

  const suzulmus = (kayitlar || []).filter((k) => {
    if (kapsamSuzgec && (k.kapsam || "") !== kapsamSuzgec) return false;
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
        {[{ k: "akis", ad: "Akış" }, { k: "mesai", ad: "Mesai / Aktivite" }].map((g) => (
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
          {kapsamlar.map((k) => <option key={k} value={k}>{k}</option>)}
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
        <div style={{ display: "grid", gap: 4 }}>
          {suzulmus.map((k) => {
            const renk = KAPSAM_RENK[k.kapsam] || "var(--erp-text-2)";
            const ayrinti = k.ayrinti && Object.keys(k.ayrinti).length
              ? Object.entries(k.ayrinti).filter(([, v]) => v !== null && v !== "" && v !== 0)
                  .map(([a, v]) => `${a}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")
              : "";
            return (
              <div key={k.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap",
                background: "#fff", border: "1px solid var(--erp-line-soft)", borderLeft: `3px solid ${renk}`,
                borderRadius: "var(--erp-r-md)", padding: "6px 10px",
              }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", whiteSpace: "nowrap" }}>
                  {k.zaman ? new Date(k.zaman).toLocaleString("tr-TR") : "—"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", whiteSpace: "nowrap" }}>
                  {k.kullanici_ad || "Bilinmeyen"}
                </span>
                <span style={{ fontSize: 12, color: "var(--erp-text)" }}>{k.eylem}</span>
                {k.kapsam && (
                  <span className="mono" style={{ fontSize: 10, color: renk, background: alfaEkle(renk, "18"), borderRadius: "var(--erp-r-pill)", padding: "1px 7px" }}>
                    {k.kapsam}
                  </span>
                )}
                {ayrinti && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", flexBasis: "100%" }}>{ayrinti}</span>
                )}
              </div>
            );
          })}
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
