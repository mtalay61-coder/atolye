// ================= KAYIT ÇEVİRİLERİ — SİTEDE GÖRÜNEN ADLAR (v1.651.0) =================
//
// Kullanıcı: "Stok, renk, beden vs. de dil değişimi olması gerekli; bunu stok sağ tık ile yaptırabiliriz." Kapsam
// (soru-cevap): YALNIZ SİTEDE görünen kayıt adları — model adı, renk, mamul tipi, asorti adı. ERP'nin kendi ekranları
// Türkçe kalır. Bedenler (36, 37…) sayı olduğu için çevrilmez.
//
// NEREDE:
//   · model adı → ürünün kendi kaydında `ceviriler: { en: { ad }, ru: { ad } }` (şema dışı → `ek`, 035)
//   · renk / mamul tipi / asorti → `tanimlar.ceviriler: { renk: { "<TR ad>": { en, ru } }, tip: {…}, asorti: {…} }`
//     Ada göre tutulur: aynı renk adı bütün ürünlerde aynı çeviriyle görünsün, tek yerden düzelsin.
// Site (`portal()`) bu sözlükleri okur; çeviri yoksa Türkçe ad görünür.
//
// "OTOMATİK" (v1.650 kararıyla aynı): dış çeviri servisi YOK (kural 7a). Sık ayakkabı kelimeleri için kelime sözlüğü
// (`KAYIT_KELIMELERI`) — "Kahve Süet" → "Brown Suede" ÖNERİSİ; kullanıcı düzeltir. Model kodları (27380 D) kelime
// değil, olduğu gibi kalır.

const KAYIT_CEVIRI_DILLERI = [["en", "English"], ["ru", "Русский"]];
const KAYIT_KELIMELERI = {
  siyah: ["Black", "Чёрный"], beyaz: ["White", "Белый"], kahve: ["Brown", "Коричневый"], kahverengi: ["Brown", "Коричневый"],
  taba: ["Tan", "Рыжий"], lacivert: ["Navy", "Тёмно-синий"], mavi: ["Blue", "Синий"], kirmizi: ["Red", "Красный"], bordo: ["Burgundy", "Бордовый"],
  yesil: ["Green", "Зелёный"], haki: ["Khaki", "Хаки"], gri: ["Grey", "Серый"], fume: ["Smoke grey", "Дымчатый"], antrasit: ["Anthracite", "Антрацит"],
  bej: ["Beige", "Бежевый"], krem: ["Cream", "Кремовый"], ten: ["Nude", "Телесный"], pudra: ["Powder pink", "Пудровый"], pembe: ["Pink", "Розовый"],
  mor: ["Purple", "Фиолетовый"], sari: ["Yellow", "Жёлтый"], turuncu: ["Orange", "Оранжевый"], altin: ["Gold", "Золотой"], gumus: ["Silver", "Серебристый"],
  vizon: ["Mink", "Норковый"], camel: ["Camel", "Кэмел"], kum: ["Sand", "Песочный"], tas: ["Stone", "Каменный"], kiremit: ["Brick", "Кирпичный"],
  koyu: ["Dark", "Тёмный"], acik: ["Light", "Светлый"], mat: ["Matte", "Матовый"], parlak: ["Glossy", "Глянцевый"], simli: ["Glitter", "Блестящий"],
  deri: ["Leather", "Кожа"], suet: ["Suede", "Замша"], nubuk: ["Nubuck", "Нубук"], rugan: ["Patent", "Лак"], kumas: ["Fabric", "Текстиль"],
  tekstil: ["Textile", "Текстиль"], file: ["Mesh", "Сетка"], kurk: ["Fur", "Мех"], kroko: ["Croco", "Крокодил"], yilan: ["Snake", "Змея"],
  // mamul tipleri
  bot: ["Boot", "Ботинки"], cizme: ["Tall boot", "Сапоги"], babet: ["Ballerina", "Балетки"], terlik: ["Slipper", "Шлёпанцы"], sandalet: ["Sandal", "Сандалии"],
  ayakkabi: ["Shoe", "Туфли"], spor: ["Sneaker", "Кроссовки"], loafer: ["Loafer", "Лоферы"], mokasen: ["Moccasin", "Мокасины"], topuklu: ["Heeled", "На каблуке"],
  klasik: ["Classic", "Классические"], gunluk: ["Casual", "Повседневные"], erkek: ["Men's", "Мужские"], kadin: ["Women's", "Женские"], cocuk: ["Kids'", "Детские"],
};
function kayitKelimeAnahtari(k) {
  return String(k || "").toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h]).replace(/[^a-z]/g, "");
}
// Kelime kelime öneri; bilinmeyen kelime (model kodu, özel ad) aynen kalır. Hiç kelime bilinmiyorsa boş (öneri yok).
function kayitCeviriOnerisi(metin, dil) {
  const j = dil === "ru" ? 1 : 0;
  let bilinen = 0;
  const parcalar = String(metin || "").split(/(\s+|[-/])/).map((p) => {
    const s = KAYIT_KELIMELERI[kayitKelimeAnahtari(p)];
    if (s) { bilinen++; return s[j]; }
    return p;
  });
  if (!bilinen) return "";
  const cikti = parcalar.join("");
  // Rusçada sıfat + ad sırası Türkçeyle aynı; ilk harf büyük, sonrakiler küçük ("Коричневый замша" → okunur öneri).
  return dil === "ru" ? cikti.split(" ").map((w, i) => (i === 0 ? w : w.charAt(0).toLocaleLowerCase("ru-RU") + w.slice(1))).join(" ") : cikti;
}

// Stok sağ tık › "Çeviriler (sitede)": model adı + bu modelin renkleri + mamul tipi tek pencerede.
function UrunCeviriPenceresi({ urun, ceviriler, onUrunKaydet, onCevirilerKaydet, onKapat, showToast }) {
  const renkler = Array.from(new Set((urun.variants || []).map((v) => v.renk).filter((r) => r && r !== "Standart")));
  const tip = urun.mamulTipi || "";
  const [ad, setAd] = useState(() => ({ en: ((urun.ceviriler || {}).en || {}).ad || "", ru: ((urun.ceviriler || {}).ru || {}).ad || "" }));
  const [renk, setRenk] = useState(() => Object.fromEntries(renkler.map((r) => [r, { ...(((ceviriler || {}).renk || {})[r] || {}) }])));
  const [tipC, setTipC] = useState(() => ({ ...(((ceviriler || {}).tip || {})[tip] || {}) }));
  const oner = () => {
    setAd((a) => ({ en: a.en || kayitCeviriOnerisi(urun.ad, "en"), ru: a.ru || kayitCeviriOnerisi(urun.ad, "ru") }));
    setRenk((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { en: v.en || kayitCeviriOnerisi(k, "en"), ru: v.ru || kayitCeviriOnerisi(k, "ru") }])));
    setTipC((t) => ({ en: t.en || kayitCeviriOnerisi(tip, "en"), ru: t.ru || kayitCeviriOnerisi(tip, "ru") }));
  };
  const kaydet = () => {
    const temiz = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, String(v || "").trim()]).filter(([, v]) => v));
    const adC = {}; KAYIT_CEVIRI_DILLERI.forEach(([d]) => { if (String(ad[d] || "").trim()) adC[d] = { ad: ad[d].trim() }; });
    onUrunKaydet(urun.id, { ceviriler: Object.keys(adC).length ? adC : undefined });
    const c = { ...(ceviriler || {}) };
    c.renk = { ...(c.renk || {}) }; renkler.forEach((r) => { const t = temiz(renk[r]); if (Object.keys(t).length) c.renk[r] = t; else delete c.renk[r]; });
    if (tip) { c.tip = { ...(c.tip || {}) }; const t = temiz(tipC); if (Object.keys(t).length) c.tip[tip] = t; else delete c.tip[tip]; }
    onCevirilerKaydet(c);
    if (showToast) showToast("Çeviriler kaydedildi — sitede müşterinin dilinde görünür");
    onKapat();
  };
  const kutu = { ...inputStyle, padding: "4px 6px", fontSize: 12, minWidth: 0 };
  const satir = (etiket, deger, ata, anahtar) => (
    <div key={anahtar} data-ceviri-satiri={anahtar} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 1fr 1fr", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12, fontWeight: 600, overflowWrap: "anywhere" }}>{etiket}</span>
      {KAYIT_CEVIRI_DILLERI.map(([d]) => (
        <input key={d} value={(deger || {})[d] || ""} placeholder={d.toUpperCase()} data-ceviri={`${anahtar}-${d}`} onChange={(e) => ata({ ...(deger || {}), [d]: e.target.value })} style={kutu} />
      ))}
    </div>
  );
  return (
    <div className="modal-arkaplan" onClick={onKapat} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
      <div data-urun-ceviri-penceresi="1" onClick={(e) => e.stopPropagation()} style={{ background: "var(--erp-panel)", borderRadius: "var(--erp-r-lg)", padding: 16, width: "min(620px, 100%)", maxHeight: "90vh", overflow: "auto", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 15 }}>Çeviriler — {urun.ad}</b>
          <button type="button" className="btn-ghost" style={{ marginLeft: "auto" }} onClick={onKapat}><X size={16} /></button>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--erp-text-2)" }}>
          Web sitesinde yabancı müşteri bu adları kendi dilinde görür; boş bırakılan Türkçe görünür. Renk ve tip çevirisi
          ortaktır (aynı adlı renk her modelde aynı). ERP ekranları değişmez.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 1fr 1fr", gap: 6, fontSize: 11, color: "var(--erp-text-3)", fontWeight: 700 }}>
          <span>Türkçe</span><span>English</span><span>Русский</span>
        </div>
        {satir(urun.ad, ad, setAd, "ad")}
        {tip && satir(`Tip: ${tip}`, tipC, setTipC, "tip")}
        {renkler.map((r) => satir(r, renk[r], (v) => setRenk((x) => ({ ...x, [r]: v })), `renk-${r}`))}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={oner} data-ceviri-oner="1" title="Boş kutuları sık kullanılan kelimelerden önerir (renk, malzeme, tip). Kontrol edip düzeltin.">Boşları öner</button>
          <button type="button" className="btn-primary btn-save" style={{ marginLeft: "auto", fontSize: 12 }} onClick={kaydet} data-ceviri-kaydet="1">Kaydet</button>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={onKapat}>Vazgeç</button>
        </div>
      </div>
    </div>
  );
}

// Tanımlar › Web Sitesi altında: bütün renk / mamul tipi / asorti çevirileri bir arada (toplu doldurma için).
function KayitCevirileriPaneli({ tanimlar, onSave, showToast }) {
  const [acik, setAcik] = useState(false);
  const [taslak, setTaslak] = useState(null);
  const kaynak = tanimlar.ceviriler || {};
  const gruplar = [
    ["renk", "Renkler", (tanimlar.renkler || []).map((r) => r.ad).filter((a) => a && a !== "Standart")],
    ["tip", "Mamul tipleri", (tanimlar.mamulTipleri || []).map((m) => m.ad).filter(Boolean)],
    ["asorti", "Asortiler", (tanimlar.asortiler || []).map((a) => a.ad).filter(Boolean)],
  ];
  const t = taslak || kaynak;
  const ata = (tur, ad, dil, deger) => setTaslak((x) => { const y = { ...(x || kaynak) }; y[tur] = { ...(y[tur] || {}) }; y[tur][ad] = { ...(y[tur][ad] || {}), [dil]: deger }; return y; });
  const oner = () => setTaslak((x) => {
    const y = { ...(x || kaynak) };
    gruplar.forEach(([tur, , adlar]) => { y[tur] = { ...(y[tur] || {}) }; adlar.forEach((ad) => { const o = { ...(y[tur][ad] || {}) }; KAYIT_CEVIRI_DILLERI.forEach(([d]) => { if (!o[d]) { const v = kayitCeviriOnerisi(ad, d); if (v) o[d] = v; } }); y[tur][ad] = o; }); });
    return y;
  });
  const kaydet = () => {
    const temiz = {};
    Object.entries(t).forEach(([tur, sozluk]) => { temiz[tur] = {}; Object.entries(sozluk || {}).forEach(([ad, c]) => { const o = {}; Object.entries(c || {}).forEach(([d, v]) => { if (String(v || "").trim()) o[d] = String(v).trim(); }); if (Object.keys(o).length) temiz[tur][ad] = o; }); });
    onSave({ ...tanimlar, ceviriler: temiz });
    setTaslak(null);
    if (showToast) showToast("Kayıt çevirileri kaydedildi");
  };
  return (
    <div data-kayit-cevirileri="1" style={{ marginTop: 16, borderTop: "1px solid var(--erp-line)", paddingTop: 10 }}>
      <button type="button" onClick={() => setAcik(!acik)} style={{ all: "unset", cursor: "pointer", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--erp-text-3)" }}>
        {acik ? "▾" : "▸"} Kayıt adlarının çevirisi (renk, tip, asorti)
      </button>
      {acik && (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--erp-text-2)" }}>Sitede müşterinin dilinde görünür. Model adlarının çevirisi stok kartında sağ tık › "Çeviriler".</p>
          {gruplar.map(([tur, baslik, adlar]) => adlar.length > 0 && (
            <div key={tur} style={{ display: "grid", gap: 4 }}>
              <b style={{ fontSize: 12 }}>{baslik}</b>
              {adlar.map((ad) => (
                <div key={ad} data-kayit-ceviri={`${tur}-${ad}`} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 1fr 1fr", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{ad}</span>
                  {KAYIT_CEVIRI_DILLERI.map(([d]) => (
                    <input key={d} value={((t[tur] || {})[ad] || {})[d] || ""} placeholder={d.toUpperCase()} onChange={(e) => ata(tur, ad, d, e.target.value)} style={{ ...inputStyle, padding: "3px 6px", fontSize: 12, minWidth: 0 }} />
                  ))}
                </div>
              ))}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={oner}>Boşları öner</button>
            {taslak && <button type="button" className="btn-primary btn-save" style={{ fontSize: 12, marginLeft: "auto" }} onClick={kaydet}>Çevirileri kaydet</button>}
            {taslak && <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setTaslak(null)}>Vazgeç</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= SİTE GRUPLARI (v1.652.0) =================
// Kullanıcı: "Fiyatları olmayan ürünler de listelensin … toplu gruplama olsun, müşteriyi o gruplamaya dahil edip
// listelensin." Karar: YALNIZ GRUBU — müşteri sitede yalnız dahil olduğu grupların (yayındaki) modellerini görür; hiçbir
// gruba dahil olmayan müşteri model görmez. Grup = { id, ad, urunIdleri[], cariIdleri[] } (`tanimlar.siteGruplari`).
// Üyelik ürün/cari kaydında değil grupta: toplu ekleme TEK tanımlar yazımı olsun (yüz ürün = yüz ürün yazımı olmasın)
// ve sunucu (site_modeller) tek yerden okusun.
function siteGrupUyeleri(gruplar, tur, id) {
  const alan = tur === "urun" ? "urunIdleri" : "cariIdleri";
  return (gruplar || []).filter((g) => (g[alan] || []).includes(id));
}

function SiteGruplariPaneli({ tanimlar, onSave, showToast, stok, cariler }) {
  const gruplar = tanimlar.siteGruplari || [];
  const [seciliId, setSeciliId] = useState(gruplar[0] ? gruplar[0].id : "");
  const [yeniAd, setYeniAd] = useState("");
  const [ara, setAra] = useState("");
  const [sekme, setSekme] = useState("urun");   // "urun" | "cari"
  const secili = gruplar.find((g) => g.id === seciliId) || null;
  const yaz = (yeni) => onSave({ ...tanimlar, siteGruplari: yeni });
  const grupEkle = () => {
    const ad = yeniAd.trim(); if (!ad) return;
    if (gruplar.some((g) => g.ad.toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"))) return showToast && showToast("Bu adla grup var");
    const g = { id: uid("sgrup"), ad, urunIdleri: [], cariIdleri: [] };
    yaz([...gruplar, g]); setSeciliId(g.id); setYeniAd("");
  };
  const grupSil = () => {
    if (!secili || !window.confirm(`"${secili.ad}" grubu silinsin mi? Bu gruptaki müşteriler gruptaki modelleri artık görmez.`)) return;
    yaz(gruplar.filter((g) => g.id !== secili.id)); setSeciliId("");
  };
  const uyeDegistir = (alan, ids, ekle) => {
    if (!secili) return;
    const kume = new Set(secili[alan] || []);
    ids.forEach((id) => (ekle ? kume.add(id) : kume.delete(id)));
    yaz(gruplar.map((g) => (g.id === secili.id ? { ...g, [alan]: Array.from(kume) } : g)));
  };
  const nrm = (x) => String(x || "").toLocaleLowerCase("tr-TR");
  const urunler = (stok || []).filter((u) => u.kategori === "Mamul" && !u.pasif && u.sitedeGoster && (!ara || nrm(u.ad).includes(nrm(ara)) || nrm(u.mamulTipi).includes(nrm(ara))));
  const musteriler = (cariler || []).filter((c) => !c.pasif && (c.tip === "Müşteri" || c.tip === "Her İkisi") && (!ara || nrm(c.unvan).includes(nrm(ara))));
  const liste = sekme === "urun" ? urunler.map((u) => ({ id: u.id, ad: u.ad, alt: u.mamulTipi || "" })) : musteriler.map((c) => ({ id: c.id, ad: c.unvan, alt: c.il || "" }));
  const alan = sekme === "urun" ? "urunIdleri" : "cariIdleri";
  const uyeler = new Set((secili && secili[alan]) || []);
  const yayindaOlmayan = sekme === "urun" ? (stok || []).filter((u) => u.kategori === "Mamul" && !u.pasif && !u.sitedeGoster).length : 0;
  const cip = (aktif) => ({ padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 999, border: "1px solid var(--erp-line)", background: aktif ? "var(--erp-text)" : "var(--erp-panel)", color: aktif ? "var(--erp-panel)" : "var(--erp-text-2)" });
  return (
    <div data-site-gruplari="1" style={{ marginTop: 16, borderTop: "1px solid var(--erp-line)", paddingTop: 10, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--erp-text-3)" }}>Site grupları — müşteri hangi modelleri görür</div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--erp-text-2)" }}>
        Müşteri sitede yalnız dahil olduğu grupların modellerini görür (gruba dahil olmayan müşteri model görmez). Gruba
        yalnız sitede yayınlanan mamuller eklenir (stok sağ tık › "Web sitesinde göster"). Fiyatı olmayan model de listelenir;
        fiyatı sipariş onayında belirlersiniz.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {gruplar.map((g) => (
          <button key={g.id} type="button" data-site-grup={g.ad} onClick={() => setSeciliId(g.id)} style={cip(g.id === seciliId)}>
            {g.ad} <span style={{ opacity: 0.7, fontWeight: 500 }}>· {(g.urunIdleri || []).length} model · {(g.cariIdleri || []).length} müşteri</span>
          </button>
        ))}
        <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") grupEkle(); }} placeholder="Yeni grup (ör. Kış 2026 bayi)" data-site-grup-yeni="1" style={{ ...inputStyle, width: 200, padding: "4px 8px", fontSize: 12 }} />
        <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={grupEkle} data-site-grup-ekle="1"><Plus size={13} /> Grup</button>
      </div>
      {secili && (
        <div style={{ display: "grid", gap: 6, background: "var(--erp-panel-2, #F7F4F9)", border: "1px solid var(--erp-line-soft)", borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: 13 }}>{secili.ad}</b>
            <button type="button" style={cip(sekme === "urun")} onClick={() => setSekme("urun")} data-site-grup-sekme="urun">Modeller ({(secili.urunIdleri || []).length})</button>
            <button type="button" style={cip(sekme === "cari")} onClick={() => setSekme("cari")} data-site-grup-sekme="cari">Müşteriler ({(secili.cariIdleri || []).length})</button>
            <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ara…" style={{ ...inputStyle, width: 160, padding: "3px 8px", fontSize: 12, marginLeft: "auto" }} />
            <button type="button" className="btn-ghost" style={{ fontSize: 11 }} onClick={() => uyeDegistir(alan, liste.map((x) => x.id), true)} data-site-grup-hepsi="1">Listelenenlerin hepsini ekle</button>
            <button type="button" className="btn-ghost" style={{ fontSize: 11 }} onClick={() => uyeDegistir(alan, liste.map((x) => x.id), false)}>Hepsini çıkar</button>
            <button type="button" className="btn-ghost" style={{ fontSize: 11, color: "var(--erp-danger)" }} onClick={grupSil}>Grubu sil</button>
          </div>
          {sekme === "urun" && yayindaOlmayan > 0 && <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{yayindaOlmayan} mamul sitede yayında değil — listede yok.</span>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 4, maxHeight: 320, overflow: "auto" }}>
            {liste.map((x) => (
              <label key={x.id} data-site-grup-uye={x.ad} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, padding: "3px 6px", borderRadius: 6, background: uyeler.has(x.id) ? "#E5F0E2" : "transparent" }}>
                <input type="checkbox" checked={uyeler.has(x.id)} onChange={(e) => uyeDegistir(alan, [x.id], e.target.checked)} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.ad}</span>
                {x.alt && <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{x.alt}</span>}
              </label>
            ))}
            {!liste.length && <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{sekme === "urun" ? "Sitede yayınlanan mamul yok." : "Müşteri yok."}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
