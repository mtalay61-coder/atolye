// ================= WEB SİTESİ AYARLARI (v1.647.0) =================
//
// Kullanıcı: "İletişim bilgilerini … uygulama içerisinden yapalım, site tasarımı v.s tüm hepsini." Sitenin bütün
// yazıları, iletişim bilgileri, rengi, logosu ve "Nasıl üretiyoruz" kartları `tanimlar.siteAyarlari`nda; site açılışta
// `site_ayarlari()` (site-portal.sql, anonim) ile okur. Sitenin kendi dosyalarındaki metinler yalnız yedek: ayar
// gelmezse (fonksiyon kurulmamış / ağ) site yine düzgün görünür.
//
// Siteye giden YALNIZ bu nesne (+ seçilirse firma logosu). Tanımlar'ın kalanı (kullanıcılar, e-posta sunucusu…)
// fonksiyonda hiç seçilmez.
//
// Yazarken buluta gitmez: taslak bu ekranda tutulur, "Siteye kaydet" ile tek yazım (her tuşta tanımlar yazmasın).

const SITE_VARSAYILAN = {
  marka: "New Diamond",
  firmaLogosu: false,
  vurguRengi: "#8A5A2B",
  tema: "otomatik",                 // "otomatik" | "acik" | "koyu"
  ustEtiket: "Ayakkabı üretimi",
  baslik: "Deriden sevkiyata, her adımda ustalık.",
  aciklama: "New Diamond; modelden kesime, sayadan montaja kadar bütün üretimi kendi atölyesinde yapar. Müşteri kodunuzla koleksiyonu inceleyin ve siparişinizi doğrudan verin.",
  dugme1: "Müşteri girişi",
  dugme2: "Teklif isteyin",
  koleksiyonBaslik: "Koleksiyon",
  koleksiyonAlt: "Müşterilerimize özel: modeller, size özel fiyatlar ve sipariş.",
  uretimGoster: true,
  uretimBaslik: "Nasıl üretiyoruz",
  uretimAlt: "Her çift aynı titizlikle, aşama aşama izlenerek.",
  uretimKartlari: [
    { ikon: "✂", baslik: "Kesim", metin: "Seçilmiş deriler, modele özel kalıplarla kesilir; fire en aza indirilir." },
    { ikon: "🧵", baslik: "Saya", metin: "Usta ellerde dikilen saya, modelin karakterini belirler." },
    { ikon: "🔨", baslik: "Montaj ve taban", metin: "Taban ve saya sağlam, uzun ömürlü bir birleşimle buluşur." },
    { ikon: "📦", baslik: "Kalite ve sevkiyat", metin: "Her çift kontrol edilir, asorti kolilere yerleştirilip zamanında sevk edilir." },
  ],
  iletisimBaslik: "İletişim",
  iletisimAlt: "Toptan sipariş ve iş birliği için bize ulaşın.",
  telefon: "", whatsapp: "", eposta: "", adres: "", haritaSorgusu: "", instagram: "",
  altYazi: "",
};

function siteAyarlariBirlestir(kayitli) {
  const k = kayitli || {};
  return { ...SITE_VARSAYILAN, ...k, uretimKartlari: Array.isArray(k.uretimKartlari) ? k.uretimKartlari : SITE_VARSAYILAN.uretimKartlari };
}

function WebSitesiAyarlari({ tanimlar, onSave, showToast }) {
  const kayitli = React.useMemo(() => siteAyarlariBirlestir(tanimlar.siteAyarlari), [tanimlar.siteAyarlari]);
  const [taslak, setTaslak] = useState(kayitli);
  // Başka cihaz kaydederse ve burada bekleyen değişiklik yoksa taslak tazelenir.
  const [kirli, setKirli] = useState(false);
  useEffect(() => { if (!kirli) setTaslak(kayitli); }, [kayitli]); // eslint-disable-line react-hooks/exhaustive-deps
  const ata = (alan, deger) => { setTaslak((t) => ({ ...t, [alan]: deger })); setKirli(true); };
  const kartAta = (i, alan, deger) => { setTaslak((t) => ({ ...t, uretimKartlari: t.uretimKartlari.map((k, j) => (j === i ? { ...k, [alan]: deger } : k)) })); setKirli(true); };
  const kartSil = (i) => { setTaslak((t) => ({ ...t, uretimKartlari: t.uretimKartlari.filter((_, j) => j !== i) })); setKirli(true); };
  const kartEkle = () => { setTaslak((t) => ({ ...t, uretimKartlari: [...t.uretimKartlari, { ikon: "★", baslik: "", metin: "" }] })); setKirli(true); };
  const kartTasi = (i, d) => { setTaslak((t) => { const l = [...t.uretimKartlari]; const j = i + d; if (j < 0 || j >= l.length) return t; [l[i], l[j]] = [l[j], l[i]]; return { ...t, uretimKartlari: l }; }); setKirli(true); };
  const kaydet = () => {
    const temiz = { ...taslak, whatsapp: String(taslak.whatsapp || "").trim() ? whatsappNumarasi(taslak.whatsapp) : "",
      uretimKartlari: taslak.uretimKartlari.filter((k) => String(k.baslik || "").trim() || String(k.metin || "").trim()) };
    onSave({ ...tanimlar, siteAyarlari: temiz });
    setKirli(false);
    if (showToast) showToast("Web sitesi ayarları kaydedildi — site yenilenince görünür");
  };
  const vazgec = () => { setTaslak(kayitli); setKirli(false); };
  const siteAdresi = String((tanimlar.firmaBilgileri || {}).website || "").trim();
  const metin = (alan, etiket, yer, uzun) => (
    <Field label={etiket}>
      {uzun
        ? <textarea value={taslak[alan] || ""} placeholder={yer || ""} rows={3} data-site-ayar={alan} onChange={(e) => ata(alan, e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
        : <input value={taslak[alan] || ""} placeholder={yer || ""} data-site-ayar={alan} onChange={(e) => ata(alan, e.target.value)} style={inputStyle} />}
    </Field>
  );
  const altBaslik = (ad) => <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--erp-text-3)", margin: "14px 0 6px" }}>{ad}</div>;
  const izgara = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 };
  return (
    <div data-web-sitesi-ayarlari="1" style={{ marginBottom: 24, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 16 }}>
      <TanimBasligi ad="Web Sitesi" />
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
        Sitenin yazıları, iletişim bilgileri, rengi ve logosu. Boş bırakılan iletişim alanı sitede gizlenir. Koleksiyon
        müşteriye özel koddadır (cari kartı › Bilgiler › Web sitesi erişimi).
        {siteAdresi && <> · <a href={/^https?:/.test(siteAdresi) ? siteAdresi : `https://${siteAdresi}`} target="_blank" rel="noopener noreferrer">Siteyi aç</a></>}
      </p>
      {kirli && (
        <div className="kayit-seridi" style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", background: "#EFE6F7", borderRadius: 8, marginBottom: 8, position: "sticky", top: 0, zIndex: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-purple)" }}>Kaydedilmemiş değişiklik var</span>
          <button type="button" className="btn-primary btn-save" data-site-ayar-kaydet="1" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }} onClick={kaydet}>Siteye kaydet</button>
          <button type="button" className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={vazgec}>Vazgeç</button>
        </div>
      )}

      {altBaslik("Görünüm")}
      <div style={izgara}>
        {metin("marka", "Marka adı")}
        <Field label="Logo">
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
            <input type="checkbox" checked={!!taslak.firmaLogosu} onChange={(e) => ata("firmaLogosu", e.target.checked)} />
            Firma logosunu kullan {!(tanimlar.firmaBilgileri || {}).logo && <span style={{ color: "var(--erp-text-3)" }}>(Firma Bilgileri'nde logo yok)</span>}
          </label>
        </Field>
        <Field label="Ana renk">
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(taslak.vurguRengi) ? taslak.vurguRengi : "#8A5A2B"} onChange={(e) => ata("vurguRengi", e.target.value)} style={{ width: 44, height: 30, padding: 0, border: "1px solid var(--erp-line)", borderRadius: 6 }} />
            <span className="mono" style={{ fontSize: 12 }}>{taslak.vurguRengi}</span>
            <button type="button" className="btn-ghost" style={{ fontSize: 11 }} onClick={() => ata("vurguRengi", SITE_VARSAYILAN.vurguRengi)}>Varsayılan</button>
          </span>
        </Field>
        <Field label="Tema">
          <select value={taslak.tema} onChange={(e) => ata("tema", e.target.value)} style={inputStyle}>
            <option value="otomatik">Ziyaretçinin cihazına göre</option>
            <option value="acik">Hep açık</option>
            <option value="koyu">Hep koyu</option>
          </select>
        </Field>
      </div>

      {altBaslik("Karşılama")}
      <div style={izgara}>
        {metin("ustEtiket", "Üst etiket")}
        {metin("baslik", "Büyük başlık")}
        {metin("dugme1", "1. düğme (koleksiyona)")}
        {metin("dugme2", "2. düğme (iletişime)")}
      </div>
      {metin("aciklama", "Açıklama", "", true)}

      {altBaslik("Koleksiyon")}
      <div style={izgara}>{metin("koleksiyonBaslik", "Başlık")}{metin("koleksiyonAlt", "Alt yazı")}</div>

      {altBaslik("Nasıl üretiyoruz")}
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginBottom: 6 }}>
        <input type="checkbox" checked={taslak.uretimGoster !== false} onChange={(e) => ata("uretimGoster", e.target.checked)} /> Bu bölüm sitede görünsün
      </label>
      {taslak.uretimGoster !== false && (
        <>
          <div style={izgara}>{metin("uretimBaslik", "Başlık")}{metin("uretimAlt", "Alt yazı")}</div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {taslak.uretimKartlari.map((k, i) => (
              <div key={i} data-site-kart-satiri={i} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input value={k.ikon || ""} onChange={(e) => kartAta(i, "ikon", e.target.value)} title="Simge (emoji)" style={{ ...inputStyle, width: 46, textAlign: "center" }} />
                <input value={k.baslik || ""} placeholder="Kart başlığı" onChange={(e) => kartAta(i, "baslik", e.target.value)} style={{ ...inputStyle, width: 170 }} />
                <input value={k.metin || ""} placeholder="Kart metni" onChange={(e) => kartAta(i, "metin", e.target.value)} style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0 }} />
                <button type="button" className="btn-ghost" title="Yukarı" onClick={() => kartTasi(i, -1)}>▲</button>
                <button type="button" className="btn-ghost" title="Aşağı" onClick={() => kartTasi(i, 1)}>▼</button>
                <button type="button" className="btn-ghost" title="Kartı sil" style={{ color: "var(--erp-danger)" }} onClick={() => kartSil(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" style={{ justifySelf: "start", fontSize: 12 }} onClick={kartEkle}>+ Kart ekle</button>
          </div>
        </>
      )}

      {altBaslik("İletişim")}
      <div style={izgara}>
        {metin("iletisimBaslik", "Başlık")}
        {metin("iletisimAlt", "Alt yazı")}
        {metin("telefon", "Telefon", "0212 000 00 00")}
        {metin("whatsapp", "WhatsApp", "05xx xxx xx xx")}
        {metin("eposta", "E-posta", "info@firma.com.tr")}
        {metin("instagram", "Instagram adresi", "https://instagram.com/…")}
        {metin("haritaSorgusu", "Harita (Google'da aranacak)", "New Diamond Ayakkabı İstanbul")}
      </div>
      {metin("adres", "Adres", "", true)}
      {metin("altYazi", "Sayfa altı yazısı (isteğe bağlı)")}
    </div>
  );
}
