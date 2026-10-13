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
  // HERKESE AÇIK VİTRİN (v1.656.0 — kullanıcı: "herkesin göreceği resim de koyalım, müşteri girişi haricinde"): girişsiz
  // ziyaretçi galeri resimlerini (`galeri`: sıkıştırılmış data URL, en fazla 12) ve stok kartında "Herkese açık" işaretli
  // modelleri (resim + ad, FİYATSIZ) görür. Sipariş için yine giriş gerekir.
  vitrinBaslik: "Koleksiyondan",
  vitrinAlt: "Modellerimizden bir seçki. Fiyat ve sipariş için müşteri girişi yapın.",
  galeri: [],
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

// ÇOKLU DİL (v1.651.0 — kullanıcı: "çoklu dil desteği olsun… ERP'de her dil için ayrıca yazsın fakat bunu otomatik
// yapsın ve değiştirebilir olsun"). Diller: İngilizce, Rusça (kullanıcı seçti). "OTOMATİK": dışarıya veri gönderen çeviri
// servisi KULLANILMAZ (proje kuralı 7a) — ilk metinlerin çevirisi burada hazır (SITE_CEVIRI) ve Türkçe metin ilk hâlindeyse
// o dilin kutusu kendiliğinden dolar; değiştirilebilir. Türkçe metin sonradan değişirse o dilin kutusunda "Türkçesi
// değişti" uyarısı çıkar (çeviri yapılırken Türkçenin ne olduğu `_kaynak`ta saklanır). Site (newdiamond-web dil.js) aynı
// sırayı izler: yazılmış çeviri → Türkçe değişmemişse hazır çeviri → Türkçe.
// Çevrilmeyenler: marka, iletişim bilgileri, renk/tema/logo (dilden bağımsız).
const SITE_DILLERI = [["tr", "Türkçe"], ["en", "English"], ["ru", "Русский"]];
const SITE_CEVRILIR = ["vitrinBaslik", "vitrinAlt", "ustEtiket", "baslik", "aciklama", "dugme1", "dugme2", "koleksiyonBaslik", "koleksiyonAlt", "uretimBaslik", "uretimAlt", "iletisimBaslik", "iletisimAlt", "altYazi"];
const SITE_CEVIRI = {
  en: {
    vitrinBaslik: "From the collection", vitrinAlt: "A selection of our models. Sign in for prices and ordering.",
    ustEtiket: "Shoe manufacturing", baslik: "From leather to shipment, craftsmanship at every step.",
    aciklama: "New Diamond carries out all production in its own workshop — from pattern and cutting to uppers and assembly. Sign in to browse the collection and place your order directly.",
    dugme1: "Customer login", dugme2: "Request a quote", koleksiyonBaslik: "Collection", koleksiyonAlt: "For our customers: models, your prices and ordering.",
    uretimBaslik: "How we make shoes", uretimAlt: "Every pair with the same care, tracked step by step.",
    iletisimBaslik: "Contact", iletisimAlt: "Get in touch for wholesale orders and partnerships.",
    uretimKartlari: [["Cutting", "Selected leathers are cut with model-specific patterns, keeping waste to a minimum."], ["Uppers", "Stitched by skilled hands, the upper gives each model its character."], ["Assembly & sole", "Sole and upper are joined into a strong, long-lasting bond."], ["Quality & shipping", "Every pair is checked, packed in assorted cartons and shipped on time."]],
  },
  ru: {
    vitrinBaslik: "Из коллекции", vitrinAlt: "Подборка наших моделей. Для цен и заказа войдите как клиент.",
    ustEtiket: "Производство обуви", baslik: "От кожи до отгрузки — мастерство на каждом этапе.",
    aciklama: "New Diamond выполняет всё производство в собственном цеху — от модели и раскроя до заготовки и сборки. Войдите, чтобы посмотреть коллекцию и оформить заказ напрямую.",
    dugme1: "Вход для клиентов", dugme2: "Запросить предложение", koleksiyonBaslik: "Коллекция", koleksiyonAlt: "Для наших клиентов: модели, ваши цены и заказ.",
    uretimBaslik: "Как мы производим", uretimAlt: "Каждая пара — с одинаковой тщательностью, этап за этапом.",
    iletisimBaslik: "Контакты", iletisimAlt: "Свяжитесь с нами по оптовым заказам и сотрудничеству.",
    uretimKartlari: [["Раскрой", "Отборная кожа кроится по лекалам модели, отходы сводятся к минимуму."], ["Заготовка", "Заготовка, сшитая мастерами, определяет характер модели."], ["Сборка и подошва", "Подошва и заготовка соединяются прочно и надолго."], ["Качество и отгрузка", "Каждая пара проверяется, упаковывается в ассортиментные коробки и отгружается вовремя."]],
  },
};
// Bir dilde alanın görünen değeri: yazılmış çeviri, yoksa (Türkçe ilk hâlindeyse) hazır çeviri, yoksa boş.
function siteCeviriDegeri(ayar, dil, alan) {
  const d = (ayar.diller && ayar.diller[dil]) || {};
  if (typeof d[alan] === "string" && d[alan] !== "") return d[alan];
  if ((ayar[alan] || "") === (SITE_VARSAYILAN[alan] || "") && SITE_CEVIRI[dil]) return SITE_CEVIRI[dil][alan] || "";
  return "";
}
function siteKartCevirisi(ayar, dil, i) {
  const d = (ayar.diller && ayar.diller[dil] && ayar.diller[dil].uretimKartlari) || [];
  if (d[i] && (d[i].baslik || d[i].metin)) return d[i];
  const k = ayar.uretimKartlari[i]; const v = SITE_VARSAYILAN.uretimKartlari[i]; const c = SITE_CEVIRI[dil] && SITE_CEVIRI[dil].uretimKartlari[i];
  if (k && v && c && k.baslik === v.baslik && k.metin === v.metin) return { baslik: c[0], metin: c[1] };
  return { baslik: "", metin: "" };
}

function siteAyarlariBirlestir(kayitli) {
  const k = kayitli || {};
  return { ...SITE_VARSAYILAN, ...k, uretimKartlari: Array.isArray(k.uretimKartlari) ? k.uretimKartlari : SITE_VARSAYILAN.uretimKartlari };
}

function WebSitesiAyarlari({ tanimlar, onSave, showToast, stok, cariler }) {
  const kayitli = React.useMemo(() => siteAyarlariBirlestir(tanimlar.siteAyarlari), [tanimlar.siteAyarlari]);
  const [taslak, setTaslak] = useState(kayitli);
  // Başka cihaz kaydederse ve burada bekleyen değişiklik yoksa taslak tazelenir.
  const [kirli, setKirli] = useState(false);
  useEffect(() => { if (!kirli) setTaslak(kayitli); }, [kayitli]); // eslint-disable-line react-hooks/exhaustive-deps
  const ata = (alan, deger) => { setTaslak((t) => ({ ...t, [alan]: deger })); setKirli(true); };
  const [dil, setDil] = useState("tr");
  // Çeviri yazımı: diller[dil][alan] + yazıldığı andaki Türkçe (`_kaynak`) — Türkçe sonra değişirse uyarı için.
  const ceviriAta = (alan, deger) => {
    setTaslak((t) => {
      const d = { ...((t.diller || {})[dil] || {}) };
      d[alan] = deger; d._kaynak = { ...(d._kaynak || {}), [alan]: t[alan] || "" };
      return { ...t, diller: { ...(t.diller || {}), [dil]: d } };
    });
    setKirli(true);
  };
  const kartCeviriAta = (i, alan, deger) => {
    setTaslak((t) => {
      const d = { ...((t.diller || {})[dil] || {}) };
      const l = [...(d.uretimKartlari || [])];
      while (l.length <= i) l.push({ baslik: "", metin: "" });
      l[i] = { ...siteKartCevirisi(t, dil, i), ...l[i], [alan]: deger, _kaynak: { baslik: (t.uretimKartlari[i] || {}).baslik || "", metin: (t.uretimKartlari[i] || {}).metin || "" } };
      d.uretimKartlari = l;
      return { ...t, diller: { ...(t.diller || {}), [dil]: d } };
    });
    setKirli(true);
  };
  const kartAta = (i, alan, deger) => { setTaslak((t) => ({ ...t, uretimKartlari: t.uretimKartlari.map((k, j) => (j === i ? { ...k, [alan]: deger } : k)) })); setKirli(true); };
  // Kart silinir/taşınırken çevirileri de aynı işlemi görür (kart ↔ çeviri sırası kaymasın). Eksik çeviri satırı o
  // anki görünen değerle (hazır çeviri dahil) doldurulur — hazır çeviri "Türkçe ilk hâlinde mi" sırasına bağlı, sıra
  // değişince kaybolmasın.
  const cevirileriDuzenle = (t, islem) => {
    const diller = { ...(t.diller || {}) };
    SITE_DILLERI.filter(([k]) => k !== "tr").forEach(([k]) => {
      const d = { ...(diller[k] || {}) };
      const l = t.uretimKartlari.map((_, i) => ({ ...siteKartCevirisi(t, k, i), ...(((d.uretimKartlari || [])[i]) || {}) }));
      d.uretimKartlari = islem(l); diller[k] = d;
    });
    return diller;
  };
  const kartSil = (i) => { setTaslak((t) => ({ ...t, diller: cevirileriDuzenle(t, (l) => l.filter((_, j) => j !== i)), uretimKartlari: t.uretimKartlari.filter((_, j) => j !== i) })); setKirli(true); };
  const kartEkle = () => { setTaslak((t) => ({ ...t, uretimKartlari: [...t.uretimKartlari, { ikon: "★", baslik: "", metin: "" }] })); setKirli(true); };
  const kartTasi = (i, d) => { setTaslak((t) => { const l = [...t.uretimKartlari]; const j = i + d; if (j < 0 || j >= l.length) return t; [l[i], l[j]] = [l[j], l[i]];
    const takas = (x) => { const y = [...x]; [y[i], y[j]] = [y[j], y[i]]; return y; };
    return { ...t, diller: cevirileriDuzenle(t, takas), uretimKartlari: l }; }); setKirli(true); };
  const kaydet = () => {
    // Boş kartlar atılırken çevirileri de aynı sırayla süzülür (kart ↔ çeviri eşleşmesi kaymasın).
    const tutulan = taslak.uretimKartlari.map((k, i) => (String(k.baslik || "").trim() || String(k.metin || "").trim() ? i : -1)).filter((i) => i >= 0);
    const diller = {};
    SITE_DILLERI.filter(([k]) => k !== "tr").forEach(([k]) => {
      const d = { ...((taslak.diller || {})[k] || {}) };
      // Otomatik (hazır) çeviri kayda yazılır: site eski sürümdeki gibi kendi hazır metnine güvenmesin, ERP'de ne
      // görünüyorsa sitede o olsun. Kaynak = şu anki Türkçe.
      SITE_CEVRILIR.forEach((alan) => { if (!d[alan]) { const v = siteCeviriDegeri(taslak, k, alan); if (v) { d[alan] = v; d._kaynak = { ...(d._kaynak || {}), [alan]: taslak[alan] || "" }; } } });
      d.uretimKartlari = tutulan.map((i) => { const c = siteKartCevirisi(taslak, k, i); return c.baslik || c.metin ? { ...c, _kaynak: c._kaynak || { baslik: taslak.uretimKartlari[i].baslik || "", metin: taslak.uretimKartlari[i].metin || "" } } : { baslik: "", metin: "" }; });
      diller[k] = d;
    });
    const temiz = { ...taslak, whatsapp: String(taslak.whatsapp || "").trim() ? whatsappNumarasi(taslak.whatsapp) : "",
      uretimKartlari: tutulan.map((i) => taslak.uretimKartlari[i]), diller };
    onSave({ ...tanimlar, siteAyarlari: temiz });
    setKirli(false);
    if (showToast) showToast("Web sitesi ayarları kaydedildi — site yenilenince görünür");
  };
  const vazgec = () => { setTaslak(kayitli); setKirli(false); };
  const siteAdresi = String((tanimlar.firmaBilgileri || {}).website || "").trim();
  const metin = (alan, etiket, yer, uzun) => {
    if (dil !== "tr") {
      // Başka dil sekmesi: yalnız çevrilen alanlar; diğerleri (iletişim, marka) dilden bağımsız → gizli.
      if (!SITE_CEVRILIR.includes(alan)) return null;
      const deger = siteCeviriDegeri(taslak, dil, alan);
      const yazilmis = !!(((taslak.diller || {})[dil] || {})[alan]);
      const kaynak = ((((taslak.diller || {})[dil] || {})._kaynak) || {})[alan];
      const eskidi = yazilmis && kaynak != null && kaynak !== (taslak[alan] || "");
      const ozellik = { value: deger, placeholder: taslak[alan] || "", "data-site-ayar": `${dil}-${alan}`, onChange: (e) => ceviriAta(alan, e.target.value), style: { ...inputStyle, ...(eskidi ? { borderColor: "var(--erp-warning, #C77700)" } : {}) } };
      return (
        <Field label={<>{etiket}{!yazilmis && deger ? <span style={{ fontSize: 10, color: "var(--erp-text-3)", fontWeight: 400 }}> · hazır çeviri</span> : null}{eskidi ? <span style={{ fontSize: 10, color: "#C77700", fontWeight: 600 }} title={`Çeviri yapılırken Türkçesi: "${kaynak}"`}> · Türkçesi değişti, kontrol edin</span> : null}</>}>
          {uzun ? <textarea rows={3} {...ozellik} style={{ ...ozellik.style, resize: "vertical" }} /> : <input {...ozellik} />}
          <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>TR: {taslak[alan] || "—"}</span>
        </Field>
      );
    }
    return (
      <Field label={etiket}>
        {uzun
          ? <textarea value={taslak[alan] || ""} placeholder={yer || ""} rows={3} data-site-ayar={alan} onChange={(e) => ata(alan, e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
          : <input value={taslak[alan] || ""} placeholder={yer || ""} data-site-ayar={alan} onChange={(e) => ata(alan, e.target.value)} style={inputStyle} />}
      </Field>
    );
  };
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

      <div data-site-dil-sekmeleri="1" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--erp-line)", margin: "4px 0 2px" }}>
        {SITE_DILLERI.map(([k, ad]) => (
          <button key={k} type="button" data-site-dil={k} onClick={() => setDil(k)}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "none", border: "none", borderBottom: `3px solid ${dil === k ? "var(--erp-text)" : "transparent"}`, color: dil === k ? "var(--erp-text)" : "var(--erp-text-3)" }}>
            {k.toUpperCase()} · {ad}
          </button>
        ))}
      </div>
      {dil !== "tr" && (
        <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "6px 0 0" }}>
          Ziyaretçi siteyi bu dilde açınca görünen metinler. İlk metinlerin çevirisi hazır gelir, istediğinizi değiştirin. Boş bırakılan alanda Türkçesi görünür.
          Menü, düğme, tablo başlıkları gibi sabit yazılar sitede zaten çevrili. İletişim bilgileri, marka, renk ve logo dilden bağımsızdır (TR sekmesinde).
        </p>
      )}
      {dil === "tr" && altBaslik("Görünüm")}
      {dil === "tr" && <div style={izgara}>
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
      </div>}

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

      {altBaslik("Herkese açık vitrin (girişsiz)")}
      <div style={izgara}>{metin("vitrinBaslik", "Başlık")}{metin("vitrinAlt", "Alt yazı")}</div>
      {dil === "tr" && (
        <div data-site-galeri="1" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 6 }}>
            Galeri resimleri (atölye, koleksiyon afişi…) — en fazla 12. Modelleri buraya eklemek için stok kartında "Herkese açık"ı işaretleyin
            (resim + ad görünür, fiyat görünmez).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {(taslak.galeri || []).map((url, i) => (
              <span key={i} data-site-galeri-resim={i} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <ColorSwatch src={url} size={72} onUrlSave={(u) => ata("galeri", (taslak.galeri || []).map((x, j) => (j === i ? u : x)))}
                  onRemove={() => ata("galeri", (taslak.galeri || []).filter((_, j) => j !== i))} />
                <span style={{ display: "flex", gap: 2 }}>
                  <button type="button" className="btn-ghost" style={{ fontSize: 10, padding: "0 4px" }} title="Sola" onClick={() => { const l = [...(taslak.galeri || [])]; if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; ata("galeri", l); } }}>◀</button>
                  <button type="button" className="btn-ghost" style={{ fontSize: 10, padding: "0 4px", color: "var(--erp-danger)" }} title="Sil" onClick={() => ata("galeri", (taslak.galeri || []).filter((_, j) => j !== i))}>✕</button>
                </span>
              </span>
            ))}
            {(taslak.galeri || []).length < 12 && (
              <span data-site-galeri-ekle="1" title="Resim ekle">
                <ColorSwatch key={(taslak.galeri || []).length} src="" size={72} onUrlSave={(u) => ata("galeri", [...(taslak.galeri || []), u])} onRemove={() => {}} />
              </span>
            )}
          </div>
        </div>
      )}

      {altBaslik("Nasıl üretiyoruz")}
      {dil === "tr" && (
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginBottom: 6 }}>
          <input type="checkbox" checked={taslak.uretimGoster !== false} onChange={(e) => ata("uretimGoster", e.target.checked)} /> Bu bölüm sitede görünsün
        </label>
      )}
      {taslak.uretimGoster !== false && (
        <>
          <div style={izgara}>{metin("uretimBaslik", "Başlık")}{metin("uretimAlt", "Alt yazı")}</div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {dil !== "tr" && taslak.uretimKartlari.map((k, i) => {
              const c = siteKartCevirisi(taslak, dil, i);
              const yazilan = ((((taslak.diller || {})[dil] || {}).uretimKartlari) || [])[i];
              const eskidi = yazilan && yazilan._kaynak && (yazilan._kaynak.baslik !== (k.baslik || "") || yazilan._kaynak.metin !== (k.metin || ""));
              return (
                <div key={i} data-site-kart-ceviri={i} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ width: 46, textAlign: "center" }}>{k.ikon}</span>
                  <input value={c.baslik || ""} placeholder={k.baslik || ""} onChange={(e) => kartCeviriAta(i, "baslik", e.target.value)} style={{ ...inputStyle, width: 170, ...(eskidi ? { borderColor: "#C77700" } : {}) }} />
                  <input value={c.metin || ""} placeholder={k.metin || ""} onChange={(e) => kartCeviriAta(i, "metin", e.target.value)} style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0, ...(eskidi ? { borderColor: "#C77700" } : {}) }} />
                  {eskidi && <span style={{ fontSize: 10, color: "#C77700", fontWeight: 600 }}>Türkçesi değişti</span>}
                </div>
              );
            })}
            {dil === "tr" && taslak.uretimKartlari.map((k, i) => (
              <div key={i} data-site-kart-satiri={i} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input value={k.ikon || ""} onChange={(e) => kartAta(i, "ikon", e.target.value)} title="Simge (emoji)" style={{ ...inputStyle, width: 46, textAlign: "center" }} />
                <input value={k.baslik || ""} placeholder="Kart başlığı" onChange={(e) => kartAta(i, "baslik", e.target.value)} style={{ ...inputStyle, width: 170 }} />
                <input value={k.metin || ""} placeholder="Kart metni" onChange={(e) => kartAta(i, "metin", e.target.value)} style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0 }} />
                <button type="button" className="btn-ghost" title="Yukarı" onClick={() => kartTasi(i, -1)}>▲</button>
                <button type="button" className="btn-ghost" title="Aşağı" onClick={() => kartTasi(i, 1)}>▼</button>
                <button type="button" className="btn-ghost" title="Kartı sil" style={{ color: "var(--erp-danger)" }} onClick={() => kartSil(i)}>✕</button>
              </div>
            ))}
            {dil === "tr" && <button type="button" className="btn-secondary" style={{ justifySelf: "start", fontSize: 12 }} onClick={kartEkle}>+ Kart ekle</button>}
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
      <SiteGruplariPaneli tanimlar={tanimlar} onSave={onSave} showToast={showToast} stok={stok} cariler={cariler} />
      <KayitCevirileriPaneli tanimlar={tanimlar} onSave={onSave} showToast={showToast} />
      <SiteRaporuPaneli cariler={cariler} />
    </div>
  );
}
