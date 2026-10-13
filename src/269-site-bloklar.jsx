// ================= SİTE BLOK DÜZENLEYİCİ (v1.662.0) =================
// Kullanıcı: "Site tasarımı yapmak için araç lazım, Canva vs., slayt gibi" → karar: ERP'de blok düzenleyici.
// Sayfa, sıralı BLOKLARDAN oluşur (`siteAyarlari.bloklar`): hazır bölümler (karşılama, vitrin, üretim, iletişim — içerikleri
// bu sekmedeki öbür alanlarda) + eklenebilen BANNER (tam genişlik resim + başlık + düğme) ve METİN + RESİM. Her blok
// sürüklenip sıralanır, gizlenir, arka plan rengi / resmi alır. Kayıt alanı yoksa site eski düzeniyle (sabit sıra) açılır.
// Yazılar dile göre: özel blokların çevirisi `ceviri[dil][alan]`, boşsa Türkçesi.
// CANLI ÖNİZLEME: sağda siteyi `?onizleme=1` ile çerçevede açar, kaydedilmemiş taslağı postMessage ile yollar (site yalnız
// kendi görünüşünü değiştirir; site.js bu mesajı yalnız erp.newdiamond.com.tr'den kabul eder).

const SITE_HAZIR_BLOKLAR = [
  { tur: "karsilama", ad: "Karşılama (büyük başlık)" },
  { tur: "vitrin", ad: "Herkese açık vitrin + galeri" },
  { tur: "uretim", ad: "Nasıl üretiyoruz" },
  { tur: "iletisim", ad: "İletişim" },
];
const SITE_OZEL_BLOKLAR = [
  { tur: "banner", ad: "Banner (tam genişlik resim)", alanlar: ["baslik", "alt", "dugme"] },
  { tur: "metinResim", ad: "Metin + resim", alanlar: ["baslik", "metin"] },
];
const SITE_BLOK_ALAN_ADI = { baslik: "Başlık", alt: "Alt yazı", dugme: "Düğme yazısı", metin: "Metin (paragrafları boş satırla ayırın)" };

// Kayıtta blok listesi yoksa sitenin bugünkü sırası.
function siteBloklari(taslak) {
  const l = Array.isArray(taslak.bloklar) ? taslak.bloklar : null;
  if (l && l.length) {
    // Eski kayıtta eksik kalan hazır bölüm sona eklenir (kaybolmasın).
    const eksik = SITE_HAZIR_BLOKLAR.filter((h) => !l.some((b) => b.tur === h.tur)).map((h) => ({ id: h.tur, tur: h.tur }));
    return [...l, ...eksik];
  }
  return SITE_HAZIR_BLOKLAR.map((h) => ({ id: h.tur, tur: h.tur }));
}

function SiteBlokDuzenleyici({ taslak, ata, dil, inputStyle }) {
  const bloklar = siteBloklari(taslak);
  const [acikId, setAcikId] = useState(null);
  const [surukle, setSurukle] = useState(null);
  const yaz = (l) => ata("bloklar", l);
  const guncelle = (id, degisim) => yaz(bloklar.map((b) => (b.id === id ? { ...b, ...degisim } : b)));
  const ceviriAta = (b, alan, deger) => guncelle(b.id, { ceviri: { ...(b.ceviri || {}), [dil]: { ...((b.ceviri || {})[dil] || {}), [alan]: deger } } });
  const tasi = (i, j) => { if (j < 0 || j >= bloklar.length || i === j) return; const l = [...bloklar]; const [x] = l.splice(i, 1); l.splice(j, 0, x); yaz(l); };
  const ekle = (tur) => {
    const id = uid("blok");
    yaz([...bloklar, tur === "banner"
      ? { id, tur, baslik: "Yeni koleksiyon", alt: "", dugme: "Bize ulaşın", link: "#iletisim", resim: "", yukseklik: "orta", hiza: "orta" }
      : { id, tur, baslik: "Başlık", metin: "", resim: "", resimSolda: false }]);
    setAcikId(id);
  };
  const ad = (b) => (SITE_HAZIR_BLOKLAR.find((h) => h.tur === b.tur) || SITE_OZEL_BLOKLAR.find((h) => h.tur === b.tur) || { ad: b.tur }).ad;
  const ozel = (b) => SITE_OZEL_BLOKLAR.some((h) => h.tur === b.tur);
  const kutu = { ...inputStyle, width: "100%" };
  const alanKutusu = (b, alan) => {
    if (dil !== "tr") {
      const v = ((b.ceviri || {})[dil] || {})[alan] || "";
      return (
        <Field key={alan} label={`${SITE_BLOK_ALAN_ADI[alan]} (${dil.toUpperCase()})`}>
          {alan === "metin"
            ? <textarea rows={4} value={v} placeholder={b[alan] || ""} onChange={(e) => ceviriAta(b, alan, e.target.value)} style={{ ...kutu, resize: "vertical" }} />
            : <input value={v} placeholder={b[alan] || ""} onChange={(e) => ceviriAta(b, alan, e.target.value)} style={kutu} />}
        </Field>
      );
    }
    return (
      <Field key={alan} label={SITE_BLOK_ALAN_ADI[alan]}>
        {alan === "metin"
          ? <textarea rows={4} value={b[alan] || ""} data-blok-alan={alan} onChange={(e) => guncelle(b.id, { [alan]: e.target.value })} style={{ ...kutu, resize: "vertical" }} />
          : <input value={b[alan] || ""} data-blok-alan={alan} onChange={(e) => guncelle(b.id, { [alan]: e.target.value })} style={kutu} />}
      </Field>
    );
  };
  const resimAlani = (b, alan, etiket) => (
    <Field label={etiket}>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <ColorSwatch key={b.id + alan + (b[alan] ? "1" : "0")} src={b[alan] || ""} size={64} onUrlSave={(u) => guncelle(b.id, { [alan]: u })} onRemove={() => guncelle(b.id, { [alan]: "" })} />
        {b[alan] && <button type="button" className="btn-ghost" style={{ fontSize: 11, color: "var(--erp-danger)" }} onClick={() => guncelle(b.id, { [alan]: "" })}>Kaldır</button>}
      </span>
    </Field>
  );
  return (
    <div data-site-bloklar="1">
      <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 6 }}>
        Sayfa yukarıdan aşağı bu sırayla görünür. Satırı tutup sürükleyin ya da ▲▼ ile taşıyın; 👁 ile gizleyin. Hazır bölümlerin yazıları
        aşağıdaki alanlarda; banner ve metin+resim bloklarının içeriği blok açılınca.
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {bloklar.map((b, i) => (
          <div key={b.id} data-site-blok={b.tur}
            draggable={dil === "tr"}
            onDragStart={() => setSurukle(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (surukle != null) tasi(surukle, i); setSurukle(null); }}
            style={{ border: "1px solid var(--erp-line)", borderRadius: 10, background: b.gizli ? "var(--erp-panel)" : "#fff", opacity: b.gizli ? 0.6 : 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", cursor: dil === "tr" ? "grab" : "default" }}>
              <span style={{ color: "var(--erp-text-3)" }}>⋮⋮</span>
              <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: "1px solid var(--erp-line)", background: b.arkaResim ? `center/cover url("${b.arkaResim}")` : (b.arkaRenk || "transparent") }} />
              <b style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{ad(b)}{ozel(b) && b.baslik ? <span style={{ fontWeight: 400, color: "var(--erp-text-2)" }}> · {b.baslik}</span> : null}</b>
              {dil === "tr" && <>
                <button type="button" className="btn-ghost" title="Yukarı" onClick={() => tasi(i, i - 1)}>▲</button>
                <button type="button" className="btn-ghost" title="Aşağı" onClick={() => tasi(i, i + 1)}>▼</button>
                <button type="button" className="btn-ghost" data-blok-gizle={b.tur} title={b.gizli ? "Göster" : "Gizle"} onClick={() => guncelle(b.id, { gizli: !b.gizli })}>{b.gizli ? "🚫" : "👁"}</button>
              </>}
              <button type="button" className="btn-ghost" data-blok-ac={b.tur} onClick={() => setAcikId(acikId === b.id ? null : b.id)}>{acikId === b.id ? "Kapat" : "Düzenle"}</button>
              {dil === "tr" && ozel(b) && <button type="button" className="btn-ghost" title="Bloğu sil" style={{ color: "var(--erp-danger)" }}
                onClick={() => { if (window.confirm(`"${b.baslik || ad(b)}" bloğu silinsin mi?`)) yaz(bloklar.filter((x) => x.id !== b.id)); }}>✕</button>}
            </div>
            {acikId === b.id && (
              <div style={{ padding: "4px 12px 12px", display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {ozel(b) && SITE_OZEL_BLOKLAR.find((h) => h.tur === b.tur).alanlar.map((a) => alanKutusu(b, a))}
                {dil === "tr" && b.tur === "banner" && <>
                  {resimAlani(b, "resim", "Banner resmi (yatay, geniş)")}
                  <Field label="Düğme bağlantısı">
                    <select value={b.link || "#iletisim"} onChange={(e) => guncelle(b.id, { link: e.target.value })} style={kutu}>
                      <option value="#iletisim">İletişim bölümü</option>
                      <option value="#vitrin">Vitrin</option>
                      <option value="musteri.html">Müşteri girişi</option>
                    </select>
                  </Field>
                  <Field label="Yükseklik">
                    <select value={b.yukseklik || "orta"} onChange={(e) => guncelle(b.id, { yukseklik: e.target.value })} style={kutu}>
                      <option value="kucuk">Kısa</option><option value="orta">Orta</option><option value="buyuk">Büyük</option>
                    </select>
                  </Field>
                  <Field label="Yazı hizası">
                    <select value={b.hiza || "orta"} onChange={(e) => guncelle(b.id, { hiza: e.target.value })} style={kutu}>
                      <option value="orta">Ortada</option><option value="sol">Solda</option>
                    </select>
                  </Field>
                </>}
                {dil === "tr" && b.tur === "metinResim" && <>
                  {resimAlani(b, "resim", "Resim")}
                  <Field label="Resim yeri">
                    <select value={b.resimSolda ? "sol" : "sag"} onChange={(e) => guncelle(b.id, { resimSolda: e.target.value === "sol" })} style={kutu}>
                      <option value="sag">Sağda</option><option value="sol">Solda</option>
                    </select>
                  </Field>
                </>}
                {dil === "tr" && b.tur !== "banner" && <>
                  <Field label="Arka plan rengi">
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(b.arkaRenk || "") ? b.arkaRenk : "#ffffff"} onChange={(e) => guncelle(b.id, { arkaRenk: e.target.value })} style={{ width: 44, height: 30, padding: 0, border: "1px solid var(--erp-line)", borderRadius: 6 }} />
                      {b.arkaRenk && <button type="button" className="btn-ghost" style={{ fontSize: 11 }} onClick={() => guncelle(b.id, { arkaRenk: "" })}>Yok</button>}
                    </span>
                  </Field>
                  {resimAlani(b, "arkaResim", "Arka plan resmi")}
                  <Field label="Yazı rengi">
                    <select value={b.yaziRengi || "koyu"} onChange={(e) => guncelle(b.id, { yaziRengi: e.target.value })} style={kutu}>
                      <option value="koyu">Koyu (açık zeminde)</option><option value="acik">Beyaz (koyu zeminde / resimde)</option>
                    </select>
                  </Field>
                </>}
                {!ozel(b) && dil !== "tr" && <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Bu bölümün çevirisi aşağıdaki alanlarda.</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      {dil === "tr" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {SITE_OZEL_BLOKLAR.map((h) => (
            <button key={h.tur} type="button" className="btn-secondary" data-blok-ekle={h.tur} style={{ fontSize: 12 }} onClick={() => ekle(h.tur)}>+ {h.ad}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Sağda sabit, açılıp kapanan önizleme çerçevesi. Çerçeve "hazırım" deyince ve her taslak değişiminde taslak yollanır.
function SiteOnizleme({ taslak, adres, kirli, onKaydet }) {
  const [acik, setAcik] = useState(false);
  const [genislik, setGenislik] = useState("masaustu");
  const cerceve = useRef(null);
  const url = (adres || "https://newdiamond.com.tr").replace(/\/$/, "");
  // Yerel dosyada (test) köken "null" / "file://" olur; postMessage bunu hedef kabul etmez → "*".
  const hedef = (() => { try { const o = new URL(url).origin; return /^https?:/.test(o) ? o : "*"; } catch (e) { return "*"; } })();
  const yolla = useCallback(() => {
    const w = cerceve.current && cerceve.current.contentWindow;
    if (w) w.postMessage({ tip: "site-onizleme", ayar: { ...taslak, bloklar: siteBloklari(taslak) } }, hedef);
  }, [taslak, hedef]);
  useEffect(() => { if (acik) yolla(); }, [acik, yolla]);
  useEffect(() => {
    if (!acik) return undefined;
    const dinle = (e) => { if (e.data && e.data.tip === "site-onizleme-hazir") yolla(); };
    window.addEventListener("message", dinle);
    return () => window.removeEventListener("message", dinle);
  }, [acik, yolla]);
  if (!acik) {
    return (
      <button type="button" className="btn-primary" data-site-onizleme-ac="1" onClick={() => setAcik(true)}
        style={{ position: "fixed", right: 18, bottom: 18, zIndex: 60, boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}>
        👁 Canlı önizleme
      </button>
    );
  }
  const w = genislik === "telefon" ? 390 : 760;
  return (
    <div data-site-onizleme="1" style={{ position: "fixed", right: 12, top: 104, bottom: 12, width: `min(${w + 20}px, 55vw)`, zIndex: 60, background: "var(--erp-panel-2)",
      border: "1px solid var(--erp-line)", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 10px", borderBottom: "1px solid var(--erp-line)" }}>
        <b style={{ fontSize: 12, flex: 1 }}>Canlı önizleme <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>· {kirli ? "kaydedilmemiş hâl" : "kayıtlı"}</span></b>
        {/* Panel sayfadaki kayıt şeridinin üstüne biniyor; kaydetme buradan da yapılabilsin. */}
        {kirli && onKaydet && <button type="button" className="btn-primary btn-save" data-site-onizleme-kaydet="1" style={{ fontSize: 11, padding: "3px 10px" }} onClick={onKaydet}>Siteye kaydet</button>}
        <button type="button" className={genislik === "masaustu" ? "btn-primary" : "btn-secondary"} style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setGenislik("masaustu")}>🖥</button>
        <button type="button" className={genislik === "telefon" ? "btn-primary" : "btn-secondary"} style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setGenislik("telefon")}>📱</button>
        <button type="button" className="btn-ghost" onClick={() => { const f = cerceve.current; if (f) f.src = f.src; }} title="Yenile">↻</button>
        <button type="button" className="btn-ghost" onClick={() => setAcik(false)} title="Kapat">✕</button>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", justifyContent: "center", background: "#ddd" }}>
        <iframe ref={cerceve} title="Site önizleme" src={/\.html$/.test(url) ? `${url}?onizleme=1` : `${url}/?onizleme=1`} onLoad={yolla}
          style={{ width: `min(${w}px, 100%)`, height: "100%", border: "none", background: "#fff" }} />
      </div>
    </div>
  );
}
