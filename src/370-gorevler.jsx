// ================= GÖREVLER =================
//
// Kullanıcı (14 Eylül): "Uygulama içi mesajlaşma yapalım; kullanıcılara görev tanımlama, yazışma,
// kontrol gibi detaylı bir modül." Seçim: ekip sohbeti + kişiden kişiye + kayda bağlı yorum +
// görev listesi; **önce görev (atama + durum)**.
//
// BU TUR: görev listesi. Sohbet ve kayda bağlı yorum sonraki turda; kayıt biçimi ikisine de
// hazırlandı (`hedef` alanı: göreve bağlı kayıt; `yorumlar` dizisi: görev altındaki yazışma).
//
// KAYIT BİÇİMİ (tek tekil tablo `gorevler`, diğer tekiller gibi):
//   { id, baslik, aciklama, atananId, atayanId, durum, oncelik, bitisTarihi,
//     olusturma, guncelleme, tamamlanma, hedef: { tip, id, etiket } | null,
//     yorumlar: [{ id, kullaniciId, kullaniciAd, metin, zaman }] }
//
// DURUM AKIŞI: Yapılacak → Yapılıyor → Kontrolde → Tamamlandı (ve her aşamadan İptal).
// "Kontrolde" kullanıcının istediği kontrol adımı: işi yapan bitirir, ATAYAN onaylar. Onaylama
// yetkisi atayanda ya da Yönetici'de; işi yapan kendi işini "Tamamlandı"ya alamaz — kontrol adımı
// aksi halde anlamını yitirir.
const GOREV_DURUMLARI = ["Yapılacak", "Yapılıyor", "Kontrolde", "Tamamlandı", "İptal"];
const GOREV_DURUM_RENK = {
  "Yapılacak": "var(--erp-text-2)", "Yapılıyor": "var(--erp-info)", "Kontrolde": "#B8860B",
  "Tamamlandı": "var(--erp-primary)", "İptal": "var(--erp-text-3)",
};
const GOREV_ONCELIK = ["Normal", "Acil"];


// Tamamlandı'ya kim alabilir: atayan ya da Yönetici. Atanan kendi işini kontrole gönderir.
function gorevOnaylayabilirMi(g, kullanici) {
  if (!kullanici) return false;
  return kullanici.rol === "Yönetici" || g.atayanId === kullanici.id;
}

// Gecikmiş: bitiş tarihi bugünden önce ve görev kapanmamış.
function gorevGecikmisMi(g, bugun) {
  if (!g.bitisTarihi || g.durum === "Tamamlandı" || g.durum === "İptal") return false;
  return g.bitisTarihi < (bugun || bugunYerel());
}

// Kullanıcının AÇIK görev sayısı — menü rozeti ve anasayfa için.
function acikGorevSayisi(gorevler, kullaniciId) {
  return (gorevler || []).filter((g) => g.atananId === kullaniciId
    && g.durum !== "Tamamlandı" && g.durum !== "İptal").length;
}

// KAYIT SEÇİCİ (kullanıcı, 14 Eylül: "görevler seçmeli olabilir — siparişi seçip veya üretimi
// seçip not eklenebilir"). Tek bir kutu: tip + arama; seçilen kayıt `{ tip, id, etiket }` olarak
// göreve/mesaja bağlanır, tıklanınca o kayda gidilir. Aynı bileşen sohbette de kullanılıyor.
function KayitSecici({ siparisler, uretim, stok, secili, onSec }) {
  const [tip, setTip] = useState("siparis");
  const [q, setQ] = useState("");
  const [acik, setAcik] = useState(false);
  const ara = q.trim().toLocaleLowerCase("tr-TR");
  const adaylar = (() => {
    if (tip === "siparis") {
      return (siparisler || []).map((x) => ({ tip: "siparis", id: x.id, etiket: `${x.siparisNo}${x.tip === "Alış" ? " (alış)" : ""}`, arama: `${x.siparisNo} ${x.tip}` }));
    }
    if (tip === "uretim") {
      return (uretim || []).map((x) => ({ tip: "uretim", id: x.id, etiket: `${x.siparisNo} · ${x.model || ""}`, arama: `${x.siparisNo} ${x.model || ""} ${x.renk || ""}` }));
    }
    return (stok || []).map((x) => ({ tip: "urun", id: x.id, etiket: x.ad, arama: `${x.ad} ${x.stokNo || ""}` }));
  })().filter((x) => !ara || x.arama.toLocaleLowerCase("tr-TR").includes(ara)).slice(0, 40);

  if (secili) {
    return (
      <span data-kayit-secili={secili.tip} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "#EAF0F4", border: "1px solid #3D6B8A", borderRadius: "var(--erp-r-pill)", padding: "2px 8px", color: "#2E5670" }}>
        {secili.tip === "siparis" ? <ClipboardList size={11} /> : secili.tip === "uretim" ? <Hammer size={11} /> : <Package size={11} />}
        {secili.etiket}
        <button type="button" data-kayit-kaldir="1" onClick={() => onSec(null)} title="Bağı kaldır"
          style={{ border: "none", background: "none", cursor: "pointer", color: "#2E5670", display: "flex", padding: 0 }}><X size={10} /></button>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, position: "relative" }}>
      <button type="button" className="btn-ghost" data-kayit-sec="1" style={{ padding: "3px 9px", fontSize: 11 }}
        onClick={() => setAcik(!acik)} title="Sipariş, üretim ya da ürün bağla">
        <ClipboardList size={11} /> Kayıt bağla
      </button>
      {acik && (
        <span style={{ position: "absolute", top: "100%", left: 0, zIndex: 30, background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 8, width: 280, boxShadow: "none", display: "grid", gap: 6 }}>
          <span style={{ display: "flex", gap: 4 }}>
            {[{ k: "siparis", ad: "Sipariş" }, { k: "uretim", ad: "Üretim" }, { k: "urun", ad: "Ürün" }].map((x) => (
              <button key={x.k} type="button" data-kayit-tip={x.k} onClick={() => setTip(x.k)}
                style={{ padding: "2px 8px", borderRadius: "var(--erp-r-pill)", fontSize: 11, cursor: "pointer",
                  border: `1.5px solid ${tip === x.k ? "var(--erp-info)" : "var(--erp-border-2)"}`, background: tip === x.k ? "#EAF0F4" : "#fff", color: tip === x.k ? "#2E5670" : "var(--erp-text-2)" }}>
                {x.ad}
              </button>
            ))}
          </span>
          <input value={q} data-kayit-ara="1" onChange={(e) => setQ(e.target.value)} placeholder="Ara…" autoFocus
            style={{ ...inputStyle, padding: "4px 7px", fontSize: 12 }} />
          <span style={{ display: "grid", gap: 2, maxHeight: 180, overflowY: "auto" }}>
            {adaylar.length === 0 && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Kayıt yok</span>}
            {adaylar.map((x) => (
              <button key={x.id} type="button" data-kayit-aday={x.id} onClick={() => { onSec(x); setAcik(false); setQ(""); }}
                style={{ textAlign: "left", border: "none", background: "none", cursor: "pointer", fontSize: 12, padding: "3px 4px", borderRadius: "var(--erp-r-sm)" }}>
                {x.etiket}
              </button>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

function GorevlerModule({ gorevler, kullanicilar, aktifKullanici, onKaydet, showToast,
  hedefGorevId, onHedefTuketildi, onKaydaGit, siparisler, uretim, stok }) {
  const [yeniAcik, setYeniAcik] = useState(false);
  const [form, setForm] = useState({ baslik: "", aciklama: "", atananId: "", oncelik: "Normal", bitisTarihi: "", hedef: null });
  const [suzgec, setSuzgec] = useState("bana");   // bana | atadigim | tumu | kapali
  const [arama, setArama] = useState("");
  const [acikId, setAcikId] = useState(null);
  const [yorumMetni, setYorumMetni] = useState({});
  const bugun = bugunYerel();

  // Bildirimden/kayıttan gelindiyse o görev açılır.
  useEffect(() => {
    if (!hedefGorevId) return;
    setAcikId(hedefGorevId);
    setSuzgec("tumu");
    if (onHedefTuketildi) onHedefTuketildi();
  }, [hedefGorevId]); // eslint-disable-line react-hooks/exhaustive-deps

  const kullaniciAd = (id) => (kullanicilar.find((k) => k.id === id) || {}).ad || "—";
  const benId = aktifKullanici ? aktifKullanici.id : null;

  function gorevEkle() {
    const baslik = form.baslik.trim();
    if (!baslik) return showToast("Görev başlığı gerekli");
    if (!form.atananId) return showToast("Görevi kime vereceğinizi seçin");
    const g = {
      id: uid("gorev"), baslik, aciklama: form.aciklama.trim(),
      atananId: form.atananId, atayanId: benId,
      durum: "Yapılacak", oncelik: form.oncelik, bitisTarihi: form.bitisTarihi || "",
      olusturma: new Date().toISOString(), guncelleme: new Date().toISOString(), tamamlanma: "",
      hedef: form.hedef || null, yorumlar: [],
    };
    onKaydet([g, ...(gorevler || [])]);
    setForm({ baslik: "", aciklama: "", atananId: "", oncelik: "Normal", bitisTarihi: "", hedef: null });
    setYeniAcik(false);
    showToast(`Görev verildi: ${kullaniciAd(g.atananId)}`);
  }

  // Durum değişimi GEÇMİŞE yazılıyor (yorum satırı olarak): "kim ne zaman ne yaptı" sorusu
  // sonradan mutlaka soruluyor; ayrı bir kayıt tutmak yerine yazışmanın içine düşüyor.
  function durumDegistir(g, yeni) {
    if (yeni === "Tamamlandı" && !gorevOnaylayabilirMi(g, aktifKullanici)) {
      return showToast("Tamamlandı'ya yalnız görevi veren ya da Yönetici alabilir — işi bitirdiyseniz Kontrole gönderin");
    }
    const not = {
      id: uid("gyorum"), kullaniciId: benId, kullaniciAd: (aktifKullanici && aktifKullanici.ad) || "—",
      metin: `durum: ${g.durum} → ${yeni}`, zaman: new Date().toISOString(), sistem: true,
    };
    onKaydet((gorevler || []).map((x) => (x.id === g.id
      ? { ...x, durum: yeni, guncelleme: not.zaman, tamamlanma: yeni === "Tamamlandı" ? not.zaman : "", yorumlar: [...(x.yorumlar || []), not] }
      : x)));
  }

  function yorumEkle(g) {
    const metin = (yorumMetni[g.id] || "").trim();
    if (!metin) return;
    const y = { id: uid("gyorum"), kullaniciId: benId, kullaniciAd: (aktifKullanici && aktifKullanici.ad) || "—", metin, zaman: new Date().toISOString() };
    onKaydet((gorevler || []).map((x) => (x.id === g.id ? { ...x, yorumlar: [...(x.yorumlar || []), y], guncelleme: y.zaman } : x)));
    setYorumMetni({ ...yorumMetni, [g.id]: "" });
  }

  function gorevSil(g) {
    if (!(aktifKullanici && (aktifKullanici.rol === "Yönetici" || g.atayanId === benId))) {
      return showToast("Görevi yalnız veren kişi ya da Yönetici silebilir");
    }
    onKaydet((gorevler || []).filter((x) => x.id !== g.id));
    showToast("Görev silindi");
  }

  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const liste = (gorevler || []).filter((g) => {
    const kapali = g.durum === "Tamamlandı" || g.durum === "İptal";
    if (suzgec === "bana" && !(g.atananId === benId && !kapali)) return false;
    if (suzgec === "atadigim" && !(g.atayanId === benId && !kapali)) return false;
    if (suzgec === "tumu" && kapali) return false;
    if (suzgec === "kapali" && !kapali) return false;
    if (!q) return true;
    return [g.baslik, g.aciklama, kullaniciAd(g.atananId), kullaniciAd(g.atayanId), (g.hedef && g.hedef.etiket) || ""]
      .some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q));
  });
  // Sıra: acil önce, sonra bitiş tarihi (tarihsizler sona), sonra yenilik.
  const sirali = [...liste].sort((a, b) => {
    if ((a.oncelik === "Acil") !== (b.oncelik === "Acil")) return a.oncelik === "Acil" ? -1 : 1;
    if (!!a.bitisTarihi !== !!b.bitisTarihi) return a.bitisTarihi ? -1 : 1;
    if (a.bitisTarihi && b.bitisTarihi && a.bitisTarihi !== b.bitisTarihi) return a.bitisTarihi < b.bitisTarihi ? -1 : 1;
    return (b.olusturma || "").localeCompare(a.olusturma || "");
  });

  const sayac = (f) => (gorevler || []).filter((g) => {
    const kapali = g.durum === "Tamamlandı" || g.durum === "İptal";
    if (f === "bana") return g.atananId === benId && !kapali;
    if (f === "atadigim") return g.atayanId === benId && !kapali;
    if (f === "tumu") return !kapali;
    return kapali;
  }).length;

  return (
    <div>
      {/* Sıkı başlık (8o/8x ile aynı düzen): arama + süzgeç + Yeni Görev tek satırda. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 380 }}>
          <Search size={14} style={{ position: "absolute", left: 9, top: 8, color: "var(--erp-text-3)" }} />
          <input value={arama} onChange={(e) => setArama(e.target.value)} data-gorev-arama="1"
            placeholder="Görev, kişi, kayıt ara…"
            style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: "var(--erp-r-md)", border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 13 }} />
        </div>
        <button className="btn-primary" data-gorev-yeni="1" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }}
          onClick={() => setYeniAcik(!yeniAcik)}><Plus size={14} /> Yeni Görev</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {[{ k: "bana", ad: "Bana verilen" }, { k: "atadigim", ad: "Benim verdiğim" }, { k: "tumu", ad: "Açık görevler" }, { k: "kapali", ad: "Kapanmış" }].map((f) => (
          <button key={f.k} type="button" data-gorev-suzgec={f.k} onClick={() => setSuzgec(f.k)}
            style={{ padding: "3px 9px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1.5px solid ${suzgec === f.k ? "var(--erp-text)" : "var(--erp-border)"}`,
              background: suzgec === f.k ? "#4A3B2814" : "#fff", color: suzgec === f.k ? "var(--erp-text)" : "var(--erp-text-2)" }}>
            {f.ad} <span className="mono" style={{ fontWeight: 400 }}>({sayac(f.k)})</span>
          </button>
        ))}
      </div>

      {yeniAcik && (
        <div data-gorev-form="1" style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <Field label="Görev">
              <input value={form.baslik} data-gorev-baslik="1" onChange={(e) => setForm({ ...form, baslik: e.target.value })}
                placeholder="örn. 10007 üretiminin kesimini bitir" style={inputStyle} />
            </Field>
            <Field label="Kime">
              <select value={form.atananId} data-gorev-atanan="1" onChange={(e) => setForm({ ...form, atananId: e.target.value })} style={inputStyle}>
                <option value="">Kişi seçin…</option>
                {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
              </select>
            </Field>
            <Field label="Bitiş tarihi">
              <input type="date" value={form.bitisTarihi} data-gorev-bitis="1" onChange={(e) => setForm({ ...form, bitisTarihi: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Öncelik">
              <select value={form.oncelik} onChange={(e) => setForm({ ...form, oncelik: e.target.value })} style={inputStyle}>
                {GOREV_ONCELIK.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Açıklama">
            <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} rows={2}
              placeholder="Ayrıntı, ölçü, dikkat edilecekler…" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <KayitSecici siparisler={siparisler} uretim={uretim} stok={stok}
              secili={form.hedef} onSec={(h) => setForm({ ...form, hedef: h })} />
            <button className="btn-primary" data-gorev-kaydet="1" onClick={gorevEkle}><Save size={14} /> Görevi Ver</button>
            <button className="btn-ghost" onClick={() => setYeniAcik(false)}><X size={14} /> Vazgeç</button>
          </div>
        </div>
      )}

      {sirali.length === 0 ? (
        <EmptyState text={suzgec === "bana" ? "Size verilmiş açık görev yok." : "Bu süzgeçte görev yok."} />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {sirali.map((g) => {
            const acik = acikId === g.id;
            const gecikmis = gorevGecikmisMi(g, bugun);
            const renk = GOREV_DURUM_RENK[g.durum] || "var(--erp-text-2)";
            return (
              <div key={g.id} data-gorev={g.id} data-gorev-durum={g.durum}
                style={{ background: "#fff", border: `1px solid ${gecikmis ? "var(--erp-orange)" : "var(--erp-border-2)"}`, borderLeft: `4px solid ${renk}`, borderRadius: "var(--erp-r-md)", padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }} onClick={() => setAcikId(acik ? null : g.id)}>
                  {g.oncelik === "Acil" && <span data-gorev-acil="1" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", border: "1px solid #E1611F", borderRadius: "var(--erp-r-pill)", padding: "1px 6px" }}>ACİL</span>}
                  <b style={{ fontSize: 13, textDecoration: g.durum === "İptal" ? "line-through" : "none" }}>{g.baslik}</b>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: renk }}>{g.durum}</span>
                  <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                    {kullaniciAd(g.atananId)}{g.atayanId !== g.atananId ? ` · veren ${kullaniciAd(g.atayanId)}` : ""}
                  </span>
                  {g.bitisTarihi && (
                    <span className="mono" data-gorev-gecikmis={gecikmis ? "1" : "0"} style={{ fontSize: 11, fontWeight: gecikmis ? 700 : 400, color: gecikmis ? "var(--erp-warn)" : "var(--erp-text-2)" }}>
                      {gecikmis ? "gecikti " : "bitiş "}{tarihYaz(g.bitisTarihi)}
                    </span>
                  )}
                  {g.hedef && (
                    <button type="button" className="mono" data-gorev-hedef={g.hedef.tip}
                      onClick={(e) => { e.stopPropagation(); if (onKaydaGit) onKaydaGit(g.hedef); }}
                      title="Görevin bağlı olduğu kaydı aç"
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "var(--erp-info)", textDecoration: "underline dotted", padding: 0 }}>
                      {g.hedef.etiket}
                    </button>
                  )}
                  {(g.yorumlar || []).filter((y) => !y.sistem).length > 0 && (
                    <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                      <MessageCircle size={10} style={{ verticalAlign: -1 }} /> {(g.yorumlar || []).filter((y) => !y.sistem).length}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto" }}>{acik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                </div>

                {acik && (
                  <div style={{ marginTop: 8, borderTop: "1px solid var(--erp-head)", paddingTop: 8, display: "grid", gap: 8 }}>
                    {g.aciklama && <div style={{ fontSize: 12, color: "var(--erp-text)", whiteSpace: "pre-wrap" }}>{g.aciklama}</div>}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Durum:</span>
                      {GOREV_DURUMLARI.map((d) => (
                        <button key={d} type="button" data-gorev-durum-dugme={d} disabled={d === g.durum}
                          onClick={() => durumDegistir(g, d)}
                          title={d === "Tamamlandı" ? "Yalnız görevi veren ya da Yönetici" : ""}
                          style={{ padding: "2px 8px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: d === g.durum ? "default" : "pointer",
                            border: `1.5px solid ${d === g.durum ? GOREV_DURUM_RENK[d] : "var(--erp-border-2)"}`,
                            background: d === g.durum ? `${alfaEkle(GOREV_DURUM_RENK[d], "1A")}` : "#fff",
                            color: d === g.durum ? GOREV_DURUM_RENK[d] : "var(--erp-text-2)" }}>
                          {d}
                        </button>
                      ))}
                      <SilOnayButonu onConfirm={() => gorevSil(g)} boyut={12} baslikNormal="Görev silinsin mi?" />
                    </div>

                    {/* YAZIŞMA: görev altındaki notlar. Durum değişimleri de buraya sistem satırı
                        olarak düşüyor — iş geçmişi tek akışta okunuyor. */}
                    <div style={{ display: "grid", gap: 4 }}>
                      {(g.yorumlar || []).map((y) => (
                        <div key={y.id} data-gorev-yorum={y.sistem ? "sistem" : "kisi"}
                          style={{ fontSize: 11, color: y.sistem ? "var(--erp-text-3)" : "var(--erp-text)", background: y.sistem ? "transparent" : "var(--erp-panel)",
                            border: y.sistem ? "none" : "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: y.sistem ? "1px 2px" : "5px 8px" }}>
                          <b style={{ fontWeight: 700 }}>{y.kullaniciAd}</b>{" "}
                          <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{tarihYaz(y.zaman, true)}</span>
                          <div style={{ whiteSpace: "pre-wrap" }}>{y.metin}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={yorumMetni[g.id] || ""} data-gorev-yorum-kutusu={g.id}
                          onChange={(e) => setYorumMetni({ ...yorumMetni, [g.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") yorumEkle(g); }}
                          placeholder="Not yaz, sor, bilgi ver…"
                          style={{ ...inputStyle, flex: 1, padding: "5px 8px", fontSize: 12 }} />
                        <button className="btn-ghost" data-gorev-yorum-gonder={g.id} style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => yorumEkle(g)}>Gönder</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
