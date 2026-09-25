function AtolyeEkrani({ cariler, orders, stok, onProsesTamamla, onProsesVer, onClose }) {
  const [personelId, setPersonelId] = useState(null);
  const [secilenIs, setSecilenIs] = useState(null);   // teslim edilecek iş
  const [alinacakIs, setAlinacakIs] = useState(null); // alınacak iş
  const [barkod, setBarkod] = useState("");
  // Otomatik fiş yazdırma tercihi. Tarayıcıda saklanamadığı için ekran açık kaldığı sürece geçerli;
  // atölye ekranı genelde gün boyu açık kalır, bu yeterli.
  const [otomatikFis, setOtomatikFis] = useState(false);
  const barkodRef = React.useRef(null);

  const personeller = (cariler || []).filter((c) => c.tip === "Personel" && !c.pasif);
  const personel = personeller.find((c) => c.id === personelId) || null;

  // Barkod alanı giriş ekranında hep odakta kalsın — okuyucu bir klavye gibi yazar, odak yoksa
  // tuşlar hiçbir yere gitmez ve personel "okuttum ama olmadı" der.
  useEffect(() => {
    if (!personelId && barkodRef.current) barkodRef.current.focus();
  }, [personelId]);

  function barkodOku(deger) {
    const temiz = String(deger || "").trim();
    if (!temiz) return;
    const bulunan = personeller.find(
      (c) => c.barkodKodu && String(c.barkodKodu).toLocaleLowerCase("tr-TR") === temiz.toLocaleLowerCase("tr-TR")
    );
    setBarkod("");
    if (bulunan) setPersonelId(bulunan.id);
  }

  // ---- ELİNDEKİ İŞLER (sağ taraf) ----
  const elindekiIsler = [];
  (orders || []).forEach((o) => {
    (o.prosesIlerleme || []).forEach((p) => {
      (p.atamalar || []).forEach((a) => {
        if (a.personelId !== personelId || !a.verildiMi || a.tamamlandiMi) return;
        const urun = (stok || []).find((x) => x.id === o.urunId);
        elindekiIsler.push({
          uretimId: o.id, proses: p.proses, atama: a, uretim: o,
          urunAd: o.model, renk: o.renk,
          resim: urun ? ((urun.renkResimleri || {})[o.renk] || urun.kapakResmi) : null,
          tamirMi: !!a.tamirMi,
        });
      });
    });
  });

  // ---- TESLİM ETTİKLERİ (alt bölüm) ----
  // Bugün teslim ettikleri. Tamamının değil BUGÜNÜN gösterilmesi bilinçli: personelin sorusu
  // "bugün ne kadar iş çıkardım" olur; geçmiş dökümü ofis ekranının işi.
  const bugun = bugunYerel();
  const teslimEttikleri = [];
  (orders || []).forEach((o) => {
    (o.prosesIlerleme || []).forEach((p) => {
      (p.atamalar || []).forEach((a) => {
        if (a.personelId !== personelId || !a.tamamlandiMi) return;
        if (!a.tamamlanmaTarihi || a.tamamlanmaTarihi.slice(0, 10) !== bugun) return;
        const urun = (stok || []).find((x) => x.id === o.urunId);
        const s = atamaSonucu(a);
        const ucret = a.tamirMi
          ? (a.tamirUcret || 0)
          : (urun && urun.prosesUcretleri ? (urun.prosesUcretleri[p.proses] || 0) : 0);
        const hurdaAdet = s.hurda.reduce((t, x) => t + x.miktar, 0);
        teslimEttikleri.push({
          uretimId: o.id, proses: p.proses, atama: a, uretim: o,
          urunAd: o.model, renk: o.renk,
          resim: urun ? ((urun.renkResimleri || {})[o.renk] || urun.kapakResmi) : null,
          tamirMi: !!a.tamirMi,
          sonuc: s,
          saglam: Object.values(s.saglam).reduce((t, x) => t + x, 0),
          tamir: s.tamir.reduce((t, x) => t + x.miktar, 0),
          hurda: hurdaAdet,
          kazanc: Math.max(0, a.miktar - hurdaAdet) * ucret,
          saat: a.tamamlanmaTarihi ? a.tamamlanmaTarihi.slice(11, 16) : "",
        });
      });
    });
  });
  teslimEttikleri.sort((a, b) => String(b.atama.tamamlanmaTarihi).localeCompare(String(a.atama.tamamlanmaTarihi)));
  const gunlukKazanc = Math.round(teslimEttikleri.reduce((t, x) => t + x.kazanc, 0) * 100) / 100;
  const gunlukAdet = teslimEttikleri.reduce((t, x) => t + x.saglam, 0);

  // ---- ALABİLECEĞİ İŞLER (sol taraf) ----
  // Bir işin alınabilmesi için: prosese henüz dağıtılmamış miktar olmalı VE önceki prosesten
  // o miktar akmış olmalı. Kişinin "Bağlı Prosesler" tanımı varsa yalnızca o prosesler gösterilir —
  // kesimci sayacının işini almasın. Tanımı yoksa tüm prosesler açıktır.
  const bagliProsesler = personel && Array.isArray(personel.bagliProsesler) ? personel.bagliProsesler : [];
  const alinabilirIsler = [];
  (orders || []).forEach((o) => {
    if (o.asama === "Tamamlandı") return;
    const ilerleme = o.prosesIlerleme || [];
    ilerleme.forEach((p, i) => {
      if (p.tamamlandiMi || p.araProsesMi) return;
      if (bagliProsesler.length > 0 && !bagliProsesler.includes(p.proses)) return;
      const mevcutBedenler = oncekiAdimdanMevcutBedenler(ilerleme, i, o.bedenMiktarlari);
      const durum = adimBedenDurumu(p, o.bedenMiktarlari, mevcutBedenler);
      const alinabilir = durum.filter((d) => d.kalan > 0);
      if (alinabilir.length === 0) return;
      const urun = (stok || []).find((x) => x.id === o.urunId);
      alinabilirIsler.push({
        uretimId: o.id, proses: p.proses, uretim: o,
        urunAd: o.model, renk: o.renk,
        resim: urun ? ((urun.renkResimleri || {})[o.renk] || urun.kapakResmi) : null,
        bedenler: alinabilir.map((d) => ({ beden: d.beden, kalan: d.kalan })),
        sira: i,
      });
    });
  });

  function Avatar({ kisi, boyut }) {
    const harfler = String(kisi.unvan || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toLocaleUpperCase("tr-TR");
    const paletHavuzu = ["var(--erp-brown)", "var(--erp-info)", "var(--erp-primary)", "var(--erp-purple)", "#B8860B", "#9C3D3D", "#2F6B4F"];
    let toplam = 0;
    String(kisi.unvan || "").split("").forEach((ch) => { toplam += ch.charCodeAt(0); });
    const renk = paletHavuzu[toplam % paletHavuzu.length];
    if (kisi.resim) {
      return <img src={kisi.resim} alt="" style={{ width: boyut, height: boyut, borderRadius: "50%", objectFit: "cover", border: `3px solid ${renk}` }} />;
    }
    return (
      <span style={{ width: boyut, height: boyut, borderRadius: "50%", background: renk, color: "var(--erp-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: boyut * 0.38, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
        {harfler}
      </span>
    );
  }

  const IsKarti = ({ is, alinabilir, onTikla }) => (
    <button
      onClick={onTikla}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: 12, width: "100%",
        background: "#fff",
        border: `3px solid ${is.tamirMi ? "#B8860B" : alinabilir ? "var(--erp-info)" : "var(--erp-primary)"}`,
        borderRadius: "var(--erp-r-lg)", cursor: "pointer", textAlign: "left",
      }}
    >
      {is.resim ? (
        <img src={is.resim} alt="" style={{ width: 72, height: 72, borderRadius: "var(--erp-r-lg)", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 72, height: 72, borderRadius: "var(--erp-r-lg)", background: "var(--erp-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PackageCheck size={34} color="var(--erp-border)" />
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {is.tamirMi && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#B8860B", color: "var(--erp-panel-2)", padding: "2px 9px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700 }}>
              <Hammer size={14} /> TAMİR
            </span>
          )}
          <span style={{ fontSize: 17, fontWeight: 700, color: "#3A291D" }}>{is.urunAd}</span>
          <span style={{ fontSize: 15, color: "var(--erp-text-2)" }}>{is.renk}</span>
        </span>
        {/* Proses adı rozette: hangi işlem olduğunu renk+konum da anlatır. */}
        <span style={{ display: "inline-block", marginTop: 5, fontSize: 13, fontWeight: 700, color: "var(--erp-panel-2)", background: prosesRengi(is.proses), padding: "2px 10px", borderRadius: "var(--erp-r-pill)" }}>
          {is.proses}
        </span>
        {/* Beden dağılımı MATRİS olarak: üst satır beden, alt satır adet. Uygulamanın her yerinde
            beden sütun başlığıdır; kartta da aynı düzen olunca göz aynı yerde arıyor. */}
        <span style={{ display: "block", marginTop: 8, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {(() => {
                const satir = alinabilir
                  ? is.bedenler.map((x) => [x.beden, x.kalan])
                  : Object.entries(is.atama.bedenMiktarlari || {}).filter(([, m]) => m > 0);
                const toplam = satir.reduce((t, [, m]) => t + m, 0);
                return (
                  <>
                    <tr>
                      {satir.map(([b]) => (
                        <td key={b} className="mono" style={{ padding: "1px 10px", fontSize: 13, color: "var(--erp-text-3)", textAlign: "center", borderBottom: "1px solid #E4D8C0" }}>{b}</td>
                      ))}
                      <td className="mono" style={{ padding: "1px 12px", fontSize: 12, color: "var(--erp-border)", textAlign: "center", borderBottom: "1px solid #E4D8C0" }}>Σ</td>
                    </tr>
                    <tr>
                      {satir.map(([b, m]) => (
                        <td key={b} className="mono" style={{ padding: "3px 10px", fontSize: 22, fontWeight: 700, color: "var(--erp-text)", textAlign: "center" }}>{m}</td>
                      ))}
                      <td className="mono" style={{ padding: "3px 12px", fontSize: 22, fontWeight: 700, color: "var(--erp-text-2)", textAlign: "center" }}>{toplam}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </span>
      </span>
      {alinabilir
        ? <Plus size={32} color="var(--erp-info)" />
        : <ChevronRight size={32} color="var(--erp-primary)" />}
    </button>
  );

  // ÜST ŞERİDİN ALTINDAN BAŞLIYOR. `inset: 0` ile ekranın tepesinden başlıyordu ama sekme
  // şeridinin zIndex'i daha yüksek (500 > 200): şerit bu ekranın başlığının ÜZERİNE oturuyordu
  // (kullanıcı bildirdi, 6 Eylül). Diğer tam ekran paneller zaten `top: PENCERE_SERIT_YUKSEKLIGI`
  // kullanıyordu; bu ikisi o kuralın dışında kalmıştı.
  return (
    <div style={{ position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: 0, right: 0, bottom: 0, zIndex: 200, background: "var(--erp-panel-2)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#4B3625", flexShrink: 0 }}>
        {(personelId || secilenIs || alinacakIs) && (
          <button
            onClick={() => {
              if (secilenIs) return setSecilenIs(null);
              if (alinacakIs) return setAlinacakIs(null);
              setPersonelId(null);
            }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", fontSize: 18, fontWeight: 700, borderRadius: "var(--erp-r-lg)", border: "none", background: "#634731", color: "var(--erp-panel-2)", cursor: "pointer" }}
          >
            <ArrowLeft size={24} /> Geri
          </button>
        )}
        {personel && !secilenIs && !alinacakIs && (
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Avatar kisi={personel} boyut={42} />
            <span style={{ fontSize: 19, fontWeight: 700, color: "var(--erp-panel-2)" }}>{personel.unvan}</span>
            {/* Bugünün özeti: kaç çift ve ne kadar. Personelin en çok merak ettiği iki sayı. */}
            {gunlukAdet > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 10, background: "#634731", borderRadius: "var(--erp-r-lg)", padding: "6px 14px" }}>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "#8FA888" }}>{gunlukAdet}</span>
                {gunlukKazanc > 0 && (
                  <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "#E1C16E" }}>
                    {gunlukKazanc.toLocaleString("tr-TR")} ₺
                  </span>
                )}
              </span>
            )}
            {/* Otomatik fiş: her teslimde termal yazıcıdan çıktı. Kapalıysa listeden tek tek basılır. */}
            <button
              onClick={() => setOtomatikFis((v) => !v)}
              title="Her teslimde otomatik fiş yazdır"
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: "var(--erp-r-lg)",
                border: `2px solid ${otomatikFis ? "#8FA888" : "var(--erp-text)"}`,
                background: otomatikFis ? "var(--erp-primary)" : "transparent", color: "var(--erp-panel-2)", cursor: "pointer",
                fontSize: 15, fontWeight: 700,
              }}
            >
              <Printer size={20} />
              {otomatikFis ? "AÇIK" : "KAPALI"}
            </button>
          </span>
        )}
        <button
          onClick={onClose}
          style={{ marginLeft: "auto", padding: "10px 18px", borderRadius: "var(--erp-r-lg)", border: "none", background: "#634731", color: "var(--erp-panel-2)", cursor: "pointer" }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* ---- GİRİŞ: BARKOD + FOTOĞRAF ---- */}
        {!personelId && (
          <div>
            {/* Barkod okutma asıl yol: en hızlısı ve hiç okuma gerektirmiyor. Kart okutulunca
                doğrudan kişinin ekranı açılır. Kartı olmayan/unutan için altta fotoğraflar var. */}
            <div style={{ background: "#fff", border: "3px solid #6B4E8A", borderRadius: 16, padding: 22, marginBottom: 22, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <ScanLine size={54} color="var(--erp-purple)" />
              <span style={{ flex: 1, minWidth: 220 }}>
                <span style={{ display: "block", fontSize: 22, fontWeight: 700, color: "var(--erp-text)", marginBottom: 8 }}>
                  Kartını okut
                </span>
                <input
                  ref={barkodRef}
                  value={barkod}
                  onChange={(e) => setBarkod(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") barkodOku(barkod); }}
                  onBlur={() => { if (barkodRef.current) setTimeout(() => barkodRef.current && barkodRef.current.focus(), 100); }}
                  style={{ width: "100%", padding: "14px 16px", fontSize: 24, fontWeight: 700, borderRadius: "var(--erp-r-lg)", border: "2px solid #C9B99A", background: "var(--erp-panel)" }}
                />
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Users size={26} color="var(--erp-brown)" />
              <span style={{ fontSize: 21, fontWeight: 700, color: "var(--erp-text)" }}>ya da kendine dokun</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {personeller.map((c) => {
                const isSayisi = (orders || []).reduce((t, o) =>
                  t + (o.prosesIlerleme || []).reduce((t2, p) =>
                    t2 + (p.atamalar || []).filter((a) => a.personelId === c.id && a.verildiMi && !a.tamamlandiMi).length, 0), 0);
                return (
                  <button
                    key={c.id}
                    onClick={() => setPersonelId(c.id)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: 16, background: "#fff", border: "2px solid #E4D8C0", borderRadius: "var(--erp-r-lg)", cursor: "pointer" }}
                  >
                    <Avatar kisi={c} boyut={84} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--erp-text)", textAlign: "center" }}>{c.unvan}</span>
                    {isSayisi > 0 && (
                      <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--erp-panel-2)", background: "var(--erp-orange)", borderRadius: "var(--erp-r-pill)", padding: "2px 11px" }}>
                        {isSayisi}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- İKİ SÜTUN: ALABİLECEĞİ İŞLER | ELİNDEKİ İŞLER ---- */}
        {personelId && !secilenIs && !alinacakIs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {/* SOL: alınabilir işler */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, background: "var(--erp-info)", color: "var(--erp-panel-2)", padding: "10px 14px", borderRadius: "var(--erp-r-lg)" }}>
                <Plus size={24} />
                <span style={{ fontSize: 19, fontWeight: 700 }}>İş Al</span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700 }}>{alinabilirIsler.length}</span>
              </div>
              {alinabilirIsler.length === 0 ? (
                <div style={{ textAlign: "center", padding: 34, color: "var(--erp-text-3)", fontSize: 16 }}>—</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {alinabilirIsler.map((is, i) => (
                    <IsKarti key={i} is={is} alinabilir onTikla={() => setAlinacakIs(is)} />
                  ))}
                </div>
              )}
            </div>

            {/* SAĞ: elindeki işler */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, background: "var(--erp-primary)", color: "var(--erp-panel-2)", padding: "10px 14px", borderRadius: "var(--erp-r-lg)" }}>
                <Check size={24} />
                <span style={{ fontSize: 19, fontWeight: 700 }}>Teslim Et</span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700 }}>{elindekiIsler.length}</span>
              </div>
              {elindekiIsler.length === 0 ? (
                <div style={{ textAlign: "center", padding: 34, color: "var(--erp-text-3)", fontSize: 16 }}>—</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {elindekiIsler.map((is, i) => (
                    <IsKarti key={i} is={is} onTikla={() => setSecilenIs(is)} />
                  ))}
                </div>
              )}

              {/* BUGÜN TESLİM ETTİKLERİ — elindekilerin hemen altında, aynı sütunda.
                  Ayrı bir sütun açmak ekranı üçe bölerdi; bu liste zaten "bitmiş" işler,
                  bakılma sıklığı düşük. */}
              {teslimEttikleri.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, background: "#8FA888", color: "#3A291D", padding: "8px 14px", borderRadius: "var(--erp-r-lg)" }}>
                    <Check size={20} />
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Bugün Teslim Ettiklerim</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700 }}>{teslimEttikleri.length}</span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {teslimEttikleri.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#F0F5EE", border: "1px solid #8FA888", borderRadius: "var(--erp-r-lg)" }}>
                        {t.resim
                          ? <img src={t.resim} alt="" style={{ width: 48, height: 48, borderRadius: "var(--erp-r-md)", objectFit: "cover", flexShrink: 0 }} />
                          : <span style={{ width: 48, height: 48, borderRadius: "var(--erp-r-md)", background: "#E4E9E2", flexShrink: 0 }} />}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#3A291D" }}>{t.urunAd}</span>
                            <span style={{ fontSize: 13, color: "var(--erp-text-2)" }}>{t.renk}</span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-panel-2)", background: prosesRengi(t.proses), padding: "1px 8px", borderRadius: "var(--erp-r-pill)" }}>{t.proses}</span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{t.saat}</span>
                          </span>
                          <span style={{ display: "flex", gap: 10, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 18, fontWeight: 700, color: "var(--erp-primary)" }}>
                              <Check size={16} />{t.saglam}
                            </span>
                            {t.tamir > 0 && (
                              <span className="mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 18, fontWeight: 700, color: "#B8860B" }}>
                                <Hammer size={16} />{t.tamir}
                              </span>
                            )}
                            {t.hurda > 0 && (
                              <span className="mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 18, fontWeight: 700, color: "var(--erp-warn)" }}>
                                <Trash2 size={16} />{t.hurda}
                              </span>
                            )}
                            {t.kazanc > 0 && (
                              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "#8A6A2E" }}>
                                {Math.round(t.kazanc * 100) / 100} ₺
                              </span>
                            )}
                          </span>
                        </span>
                        {/* Fiş yeniden basılabilir: kaybolur, yırtılır, mürekkep biter. */}
                        <button
                          onClick={() => fisYazdir(teslimFisiHTML({
                            personelAdi: personel.unvan, urunAd: t.urunAd, renk: t.renk, proses: t.proses,
                            sonuc: t.sonuc, atamaMiktar: t.atama.miktar, ucret: Math.round(t.kazanc * 100) / 100,
                            fisNo: t.uretim.siparisNo,
                          }))}
                          title="Fişi yeniden yazdır"
                          style={{ width: 46, height: 46, borderRadius: "var(--erp-r-lg)", border: "2px solid #8FA888", background: "#fff", color: "var(--erp-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        >
                          <Printer size={22} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- İŞ ALMA: kaç tane alacak ---- */}
        {alinacakIs && (
          <AtolyeIsAlmaEkrani
            is={alinacakIs}
            onGonder={(bedenMiktarlari) => {
              onProsesVer(alinacakIs.uretimId, alinacakIs.proses, personelId, bedenMiktarlari);
              setAlinacakIs(null);
            }}
          />
        )}

        {/* ---- TESLİM: sağlam / tamir / hurda ---- */}
        {secilenIs && (
          <AtolyeTeslimEkrani
            is={secilenIs}
            onGonder={(sonuc) => {
              onProsesTamamla(secilenIs.uretimId, secilenIs.proses, secilenIs.atama.id, sonuc);
              if (otomatikFis && personel) {
                // Ücret burada hesaplanır: teslim işlendikten sonra listeyi beklemek yerine,
                // fişi hemen basmak için gereken tek şey aynı formül.
                const urun = (stok || []).find((x) => x.id === secilenIs.uretim.urunId);
                const birim = secilenIs.atama.tamirMi
                  ? (secilenIs.atama.tamirUcret || 0)
                  : (urun && urun.prosesUcretleri ? (urun.prosesUcretleri[secilenIs.proses] || 0) : 0);
                const hurdaAdet = (sonuc.hurda || []).reduce((t, x) => t + x.miktar, 0);
                fisYazdir(teslimFisiHTML({
                  personelAdi: personel.unvan,
                  urunAd: secilenIs.urunAd, renk: secilenIs.renk, proses: secilenIs.proses,
                  sonuc, atamaMiktar: secilenIs.atama.miktar,
                  ucret: Math.round(Math.max(0, secilenIs.atama.miktar - hurdaAdet) * birim * 100) / 100,
                  fisNo: secilenIs.uretim.siparisNo,
                }));
              }
              setSecilenIs(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// İş alma — MATRİS düzeni. Uygulamanın her yerinde beden bilgisi sütun başlığı olarak duruyor
// (stok matrisi, sipariş kalemleri, tedarik planlama); atölye ekranında farklı bir düzen kullanmak
// aynı kişinin iki ekranı ayrı ayrı öğrenmesini gerektirirdi.
// Varsayılan olarak TAMAMI seçili gelir — çoğu durumda işin hepsi alınır.
function AtolyeIsAlmaEkrani({ is, onGonder }) {
  const [miktarlar, setMiktarlar] = useState(() => {
    const bas = {};
    is.bedenler.forEach((x) => { bas[x.beden] = x.kalan; });
    return bas;
  });

  function degistir(beden, yon) {
    const ust = (is.bedenler.find((x) => x.beden === beden) || {}).kalan || 0;
    setMiktarlar((o) => ({ ...o, [beden]: Math.max(0, Math.min(ust, (o[beden] || 0) + yon)) }));
  }
  function hepsi(tam) {
    const yeni = {};
    is.bedenler.forEach((x) => { yeni[x.beden] = tam ? x.kalan : 0; });
    setMiktarlar(yeni);
  }

  const toplam = Object.values(miktarlar).reduce((t, x) => t + x, 0);
  const tumToplam = is.bedenler.reduce((t, x) => t + x.kalan, 0);

  return (
    <div>
      <AtolyeIsBasligi is={is} />

      <div style={{ overflowX: "auto", background: "#fff", border: "2px solid #E4D8C0", borderRadius: "var(--erp-r-lg)", padding: 12 }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 10px" }} />
              {is.bedenler.map((x) => (
                <th key={x.beden} className="mono" style={{ padding: "6px 10px", fontSize: 20, fontWeight: 700, color: "#3A291D", textAlign: "center" }}>
                  {x.beden}
                </th>
              ))}
              <th className="mono" style={{ padding: "6px 14px", fontSize: 16, fontWeight: 700, color: "var(--erp-text-2)", textAlign: "center" }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {/* Kalan satırı: alınabilecek üst sınır. Rakam okunur, metin gerekmiyor. */}
            <tr style={{ borderTop: "2px solid #6B5A48" }}>
              <td style={{ padding: "8px 10px", fontSize: 14, color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>bekleyen</td>
              {is.bedenler.map((x) => (
                <td key={x.beden} className="mono" style={{ padding: "8px 10px", fontSize: 20, textAlign: "center", color: "var(--erp-text-3)" }}>
                  {x.kalan}
                </td>
              ))}
              <td className="mono" style={{ padding: "8px 14px", fontSize: 20, textAlign: "center", color: "var(--erp-text-3)" }}>{tumToplam}</td>
            </tr>
            {/* Alınan satırı: dokunmatik +/− hücre içinde. */}
            <tr style={{ borderTop: "1px solid #E4D8C0" }}>
              <td style={{ padding: "8px 10px", fontSize: 15, fontWeight: 700, color: "var(--erp-info)", whiteSpace: "nowrap" }}>alınan</td>
              {is.bedenler.map((x) => (
                <td key={x.beden} style={{ padding: "8px 6px", textAlign: "center" }}>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <button
                      onClick={() => degistir(x.beden, +1)}
                      style={{ width: 52, height: 40, borderRadius: "var(--erp-r-lg)", border: "none", background: "var(--erp-info)", color: "var(--erp-panel-2)", fontSize: 24, fontWeight: 700, cursor: "pointer" }}
                    >
                      +
                    </button>
                    <span className="mono" style={{ fontSize: 30, fontWeight: 700, color: miktarlar[x.beden] > 0 ? "var(--erp-info)" : "var(--erp-border)" }}>
                      {miktarlar[x.beden]}
                    </span>
                    <button
                      onClick={() => degistir(x.beden, -1)}
                      style={{ width: 52, height: 40, borderRadius: "var(--erp-r-lg)", border: "2px solid #3D6B8A55", background: "#fff", color: "var(--erp-info)", fontSize: 24, fontWeight: 700, cursor: "pointer" }}
                    >
                      −
                    </button>
                  </span>
                </td>
              ))}
              <td className="mono" style={{ padding: "8px 14px", fontSize: 30, fontWeight: 700, textAlign: "center", color: "var(--erp-info)" }}>{toplam}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {/* Hepsini seç / temizle: beden sayısı çoksa tek tek dokunmak yorucu. */}
        <button onClick={() => hepsi(true)} style={{ padding: "12px 22px", fontSize: 17, fontWeight: 700, borderRadius: "var(--erp-r-lg)", border: "2px solid #3D6B8A", background: "#fff", color: "var(--erp-info)", cursor: "pointer" }}>
          Hepsi
        </button>
        <button onClick={() => hepsi(false)} style={{ padding: "12px 22px", fontSize: 17, fontWeight: 700, borderRadius: "var(--erp-r-lg)", border: "2px solid #C9B99A", background: "#fff", color: "var(--erp-text-2)", cursor: "pointer" }}>
          Sıfırla
        </button>
        <button
          onClick={() => toplam > 0 && onGonder(miktarlar)}
          disabled={toplam === 0}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 12,
            padding: "18px 40px", fontSize: 24, fontWeight: 700, borderRadius: 16,
            border: "none", background: "var(--erp-info)", color: "var(--erp-panel-2)", cursor: "pointer",
            opacity: toplam === 0 ? 0.4 : 1,
          }}
        >
          <Plus size={30} /> İşi Al
        </button>
      </div>
    </div>
  );
}

// İki ekranın ortak başlığı: ürün fotoğrafı, model, renk, proses rozeti.
function AtolyeIsBasligi({ is }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
      {is.resim && <img src={is.resim} alt="" style={{ width: 72, height: 72, borderRadius: "var(--erp-r-lg)", objectFit: "cover" }} />}
      <span>
        <span style={{ display: "block", fontSize: 22, fontWeight: 700, color: "#3A291D" }}>{is.urunAd}</span>
        <span style={{ fontSize: 18, color: "var(--erp-text-2)" }}>{is.renk}</span>
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--erp-panel-2)", background: prosesRengi(is.proses), padding: "5px 16px", borderRadius: "var(--erp-r-pill)" }}>
        {is.proses}
      </span>
      {is.tamirMi && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, background: "#B8860B", color: "var(--erp-panel-2)", padding: "5px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 16, fontWeight: 700 }}>
          <Hammer size={18} /> TAMİR
        </span>
      )}
    </div>
  );
}

// Teslim — MATRİS düzeni. Sütunlar beden, satırlar sonuç türü:
//   verilen  (değişmez, üst sınır)
//   ✓ sağlam (otomatik hesaplanır: verilen − tamir − hurda)
//   🔨 tamir  (+/− ile girilir)
//   🗑 hurda  (+/− ile girilir)
//
// Sağlamın ELLE girilmemesi bilinçli: kullanıcıdan üç sayıyı toplama tutturmasını beklemek,
// okuma yazma bilmeyen biri için gereksiz bir yük. Tamir/hurda artınca sağlam kendiliğinden düşer.
function AtolyeTeslimEkrani({ is, onGonder }) {
  const bedenler = Object.entries(is.atama.bedenMiktarlari || {}).filter(([, m]) => m > 0).map(([b]) => b);
  const [sonuclar, setSonuclar] = useState(() => {
    const bas = {};
    bedenler.forEach((b) => { bas[b] = { tamir: 0, hurda: 0 }; });
    return bas;
  });

  const verilen = (b) => is.atama.bedenMiktarlari[b] || 0;
  const saglam = (b) => verilen(b) - sonuclar[b].tamir - sonuclar[b].hurda;

  function degistir(beden, tur, yon) {
    setSonuclar((onceki) => {
      const s = { ...onceki[beden] };
      const yeni = Math.max(0, s[tur] + yon);
      const digeri = tur === "tamir" ? s.hurda : s.tamir;
      // Toplam verilen miktarı aşamaz; aşarsa sağlam eksiye düşerdi.
      if (yeni + digeri > verilen(beden)) return onceki;
      s[tur] = yeni;
      return { ...onceki, [beden]: s };
    });
  }

  const toplamSaglam = bedenler.reduce((t, b) => t + saglam(b), 0);
  const toplamTamir = bedenler.reduce((t, b) => t + sonuclar[b].tamir, 0);
  const toplamHurda = bedenler.reduce((t, b) => t + sonuclar[b].hurda, 0);
  const toplamVerilen = bedenler.reduce((t, b) => t + verilen(b), 0);

  function gonder() {
    const saglamHarita = {};
    const tamir = [];
    const hurda = [];
    bedenler.forEach((b) => {
      if (saglam(b) > 0) saglamHarita[b] = saglam(b);
      // Sebep, hedef proses ve ücret ATÖLYEDE sorulmaz — o kararlar ofiste verilir.
      // Buradaki kişiden yalnızca "kaç tane" bilgisi istenir.
      if (sonuclar[b].tamir > 0) tamir.push({ beden: b, miktar: sonuclar[b].tamir, hedefProses: is.proses, sebep: "", hammaddeler: [], ucret: 0, personelId: null });
      if (sonuclar[b].hurda > 0) hurda.push({ beden: b, miktar: sonuclar[b].hurda, sebep: "" });
    });
    onGonder({ saglam: saglamHarita, tamir, hurda });
  }

  // Tamir/hurda hücresi: üstte +, ortada rakam, altta −. Dikey düzen dar sütuna sığar.
  const sayacHucresi = (beden, tur, renk) => {
    const deger = sonuclar[beden][tur];
    const digeri = tur === "tamir" ? sonuclar[beden].hurda : sonuclar[beden].tamir;
    const artirilabilir = deger + digeri < verilen(beden);
    return (
      <td key={beden} style={{ padding: "6px", textAlign: "center" }}>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => degistir(beden, tur, +1)}
            disabled={!artirilabilir}
            style={{ width: 52, height: 38, borderRadius: "var(--erp-r-lg)", border: "none", background: renk, color: "var(--erp-panel-2)", fontSize: 22, fontWeight: 700, cursor: "pointer", opacity: artirilabilir ? 1 : 0.25 }}
          >
            +
          </button>
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: deger > 0 ? renk : "var(--erp-border)" }}>{deger}</span>
          <button
            onClick={() => degistir(beden, tur, -1)}
            disabled={deger === 0}
            style={{ width: 52, height: 38, borderRadius: "var(--erp-r-lg)", border: `2px solid ${renk}55`, background: "#fff", color: renk, fontSize: 22, fontWeight: 700, cursor: "pointer", opacity: deger === 0 ? 0.25 : 1 }}
          >
            −
          </button>
        </span>
      </td>
    );
  };

  const satirBasligi = (Ikon, metin, renk) => (
    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {Ikon && <Ikon size={22} color={renk} />}
        <span style={{ fontSize: 15, fontWeight: 700, color: renk }}>{metin}</span>
      </span>
    </td>
  );

  return (
    <div>
      <AtolyeIsBasligi is={is} />

      <div style={{ overflowX: "auto", background: "#fff", border: "2px solid #E4D8C0", borderRadius: "var(--erp-r-lg)", padding: 12 }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 10px" }} />
              {bedenler.map((b) => (
                <th key={b} className="mono" style={{ padding: "6px 10px", fontSize: 20, fontWeight: 700, color: "#3A291D", textAlign: "center" }}>{b}</th>
              ))}
              <th className="mono" style={{ padding: "6px 14px", fontSize: 16, fontWeight: 700, color: "var(--erp-text-2)", textAlign: "center" }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "2px solid #6B5A48" }}>
              {satirBasligi(null, "verilen", "var(--erp-text-2)")}
              {bedenler.map((b) => (
                <td key={b} className="mono" style={{ padding: "8px 10px", fontSize: 20, textAlign: "center", color: "var(--erp-text-3)" }}>{verilen(b)}</td>
              ))}
              <td className="mono" style={{ padding: "8px 14px", fontSize: 20, textAlign: "center", color: "var(--erp-text-3)" }}>{toplamVerilen}</td>
            </tr>

            <tr style={{ borderTop: "1px solid #E4D8C0", background: "#F0F5EE" }}>
              {satirBasligi(Check, "sağlam", "var(--erp-primary)")}
              {bedenler.map((b) => (
                <td key={b} className="mono" style={{ padding: "10px", fontSize: 30, fontWeight: 700, textAlign: "center", color: "var(--erp-primary)" }}>{saglam(b)}</td>
              ))}
              <td className="mono" style={{ padding: "10px 14px", fontSize: 30, fontWeight: 700, textAlign: "center", color: "var(--erp-primary)" }}>{toplamSaglam}</td>
            </tr>

            <tr style={{ borderTop: "1px solid #E4D8C0" }}>
              {satirBasligi(Hammer, "tamir", "#B8860B")}
              {bedenler.map((b) => sayacHucresi(b, "tamir", "#B8860B"))}
              <td className="mono" style={{ padding: "6px 14px", fontSize: 26, fontWeight: 700, textAlign: "center", color: toplamTamir > 0 ? "#B8860B" : "var(--erp-border)" }}>{toplamTamir}</td>
            </tr>

            <tr style={{ borderTop: "1px solid #E4D8C0" }}>
              {satirBasligi(Trash2, "hurda", "var(--erp-warn)")}
              {bedenler.map((b) => sayacHucresi(b, "hurda", "var(--erp-warn)"))}
              <td className="mono" style={{ padding: "6px 14px", fontSize: 26, fontWeight: 700, textAlign: "center", color: toplamHurda > 0 ? "var(--erp-warn)" : "var(--erp-border)" }}>{toplamHurda}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
        <button
          onClick={gonder}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 12,
            padding: "18px 44px", fontSize: 24, fontWeight: 700, borderRadius: 16,
            border: "none", background: "var(--erp-primary)", color: "var(--erp-panel-2)", cursor: "pointer",
          }}
        >
          <Check size={30} /> Bitti
        </button>
      </div>
    </div>
  );
}

