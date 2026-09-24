// ================= MODELHANE =================
//
// Kullanıcı (17 Eylül): *"Modelhane oluşturmamız gerekiyor. Amacımız henüz koleksiyona girmeyen
// mamulleri oluşturmak... Modelci model çizimlerini yükleyecek. Kalıp, taban, aksesuar, deri vs.
// tüm işlemleri detaylı girdiği, teknik çizimleri, renderları yüklediği, reçete oluşturup üretim
// yaptığı alan olması gerekir."*
//
// NEDEN AYRI KAYIT (stok ürünü değil): koleksiyona girmemiş bir model STOK DEĞİLDİR. Ürün kartı
// olarak açılsa stok listesine, stok değeri raporuna, hammadde ihtiyaç hesabına ve veri denetimine
// karışırdı — "18 kayıtlı ürün" sayısı gerçeği söylemezdi. Onun için ayrı tablo (`modeller`),
// ama YAPISI ürün kartıyla aynı: koleksiyona alınırken kopyalamak tek adım olsun.
//
// AŞAMA AKIŞI (sektörde "stage/gate"): her modelin nerede olduğu tek bakışta görünsün. Numune
// turları sektörde proto → geliştirme → onaylı (sealed) diye ilerliyor; onaylı numune üretimin
// kalite ölçütü oluyor, o yüzden "Onaylı" ayrı bir aşama.
const MODEL_ASAMALARI = [
  { key: "fikir", ad: "Fikir", renk: "var(--erp-text-3)" },
  { key: "cizim", ad: "Çizim", renk: "var(--erp-purple)" },
  { key: "kalip", ad: "Kalıp / Taban", renk: "var(--erp-info)" },
  { key: "numune", ad: "Numune", renk: "var(--erp-brown)" },
  { key: "revizyon", ad: "Revizyon", renk: "var(--erp-warn)" },
  { key: "onayli", ad: "Onaylı", renk: "var(--erp-primary)" },
  { key: "koleksiyon", ad: "Koleksiyonda", renk: "var(--erp-primary-2)" },
];

function modelAsamasi(key) {
  return MODEL_ASAMALARI.find((a) => a.key === key) || MODEL_ASAMALARI[0];
}

function ModelhaneModule({ receteSablonlari, onReceteSablonuKaydet, kurlar, stok, onNumuneUret, onNumuneUretimi, modeller, onSave, onKoleksiyonaAl, showToast, kullaniciYetkisiVar }) {
  // Liste / katalog ve resim büyütme (21 Eylül).
  const [katalogMod, setKatalogMod] = useState(false);
  const [buyukResim, setBuyukResim] = useState(null);
  // İKİ SEKME (kullanıcı, 17 Eylül: "resimler bölümü olsun, resimlerden model yapmak için").
  // "Resimler" bir İLHAM HAVUZU: fuarda çekilen fotoğraf, müşteriden gelen görsel, internetten
  // bulunan referans. Bunlar henüz model değil; biri seçilip "Model Yap" denince modele dönüşüyor
  // ve o resim modelin KAPAK RESMİ oluyor.
  //
  // İlham kayıtları `modeller` listesinde `tip: "ilham"` ile duruyor — ayrı tablo açmak yerine,
  // çünkü ikisi aynı hayatın iki ucu ve resim modele dönüşünce aynı kayıt yolunu kullanıyor.
  // Model listesi bunları göstermiyor (`tip !== "ilham"` süzgeci).
  const [anaSekme, setAnaSekme] = useState("modeller");
  const [arama, setArama] = useState("");
  const [asamaSuzgec, setAsamaSuzgec] = useState("acik");   // acik | tumu | <asama>
  const [acikModelId, setAcikModelId] = useState(null);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeni, setYeni] = useState({ kod: "", ad: "", sezon: "", modelci: "" });

  const acikModel = (modeller || []).find((m) => m.id === acikModelId) || null;

  // "Açık" süzgeci: koleksiyona alınmamış her model. Modelhanenin asıl listesi bu — koleksiyona
  // girenler arşiv sayılıyor ama silinmiyor, gelecek sezonda onlara bakılıyor.
  const ilhamlar = (modeller || []).filter((m) => m.tip === "ilham");
  const suzulmus = (modeller || []).filter((m) => {
    if (m.tip === "ilham") return false;
    if (asamaSuzgec === "acik" && m.asama === "koleksiyon") return false;
    if (asamaSuzgec !== "acik" && asamaSuzgec !== "tumu" && m.asama !== asamaSuzgec) return false;
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    return [m.kod, m.ad, m.sezon, m.modelci, m.kalip, m.taban]
      .some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q));
  });

  function modelGuncelle(id, alanlar) {
    onSave((modeller || []).map((m) => (m.id === id ? { ...m, ...alanlar } : m)));
  }

  function ilhamEkle(url) {
    if (!url) return;
    onSave([{ id: uid("ilham"), tip: "ilham", gorsel: url, not: "", taban: "", modelAdi: "",
      olusturuldu: new Date().toISOString() }, ...(modeller || [])]);
    showToast("Resim ilham havuzuna eklendi");
  }

  // İLHAMDAN MODEL: resim modelin KAPAK RESMİ ve ilk tasarım görseli oluyor, düşünülen taban
  // künyeye geçiyor. İlham kaydı SİLİNİYOR (modele dönüştü, havuzda ikinci kez durması kafa
  // karıştırır) ama görseli ve notu modelde yaşamaya devam ediyor.
  function ilhamdanModelYap(ilham) {
    const ad = String(ilham.modelAdi || "").trim();
    if (!ad) return showToast("Model adı yazın, sonra \"Model Yap\" deyin");
    const kod = `M-${String((modeller || []).filter((m) => m.tip !== "ilham").length + 1).padStart(3, "0")}`;
    const kayit = {
      id: uid("model"), kod, ad, sezon: "", modelci: "",
      asama: "fikir", kalip: "", taban: ilham.taban || "", topuk: "", bedenSerisi: "",
      not: ilham.not || "",
      kapakResmi: ilham.gorsel,
      tasarimGorselleri: [{ id: uid("mg"), gorsel: ilham.gorsel, baslik: "İlham resmi" }],
      teknikCizimler: [], teknikNot: "", recete: [],
      olusturuldu: new Date().toISOString(),
      gecmis: [{ zaman: new Date().toISOString(), olay: `Model resimden oluşturuldu${ilham.taban ? ` · düşünülen taban: ${ilham.taban}` : ""}` }],
    };
    onSave([kayit, ...(modeller || []).filter((m) => m.id !== ilham.id)]);
    setAnaSekme("modeller");
    setAcikModelId(kayit.id);
    showToast(`${kod} · ${ad} oluşturuldu`);
  }

  function modelEkle() {
    const ad = yeni.ad.trim();
    if (!ad) return showToast("Model adı gerekli");
    const kod = yeni.kod.trim() || `M-${String((modeller || []).length + 1).padStart(3, "0")}`;
    if ((modeller || []).some((m) => String(m.kod || "").toLocaleLowerCase("tr-TR") === kod.toLocaleLowerCase("tr-TR"))) {
      return showToast(`"${kod}" kodu zaten kullanılıyor`);
    }
    const kayit = {
      id: uid("model"), kod, ad, sezon: yeni.sezon.trim(), modelci: yeni.modelci.trim(),
      asama: "fikir", kalip: "", taban: "", topuk: "", bedenSerisi: "",
      tasarimGorselleri: [], teknikCizimler: [], teknikNot: "", recete: [],
      olusturuldu: new Date().toISOString(), gecmis: [{ zaman: new Date().toISOString(), olay: "Model açıldı" }],
    };
    onSave([kayit, ...(modeller || [])]);
    setYeni({ kod: "", ad: "", sezon: "", modelci: "" });
    setYeniAcik(false);
    setAcikModelId(kayit.id);
    showToast(`${kod} açıldı`);
  }

  function asamaDegistir(model, yeniAsama) {
    if (yeniAsama === "koleksiyon") return;   // o yol "Koleksiyona Al" düğmesinden geçiyor
    modelGuncelle(model.id, {
      asama: yeniAsama,
      gecmis: [...(model.gecmis || []), { zaman: new Date().toISOString(), olay: `Aşama: ${modelAsamasi(yeniAsama).ad}` }],
    });
  }

  const inputStil = { padding: "8px 10px", fontSize: 13, borderRadius: "var(--erp-r-md)", border: "1px solid #C9B99A", background: "#fff" };

  return (
    <div data-modelhane="1">
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[{ k: "modeller", ad: `Modeller (${(modeller || []).filter((m) => m.tip !== "ilham").length})` },
          { k: "resimler", ad: `Resimler (${ilhamlar.length})` }].map((x) => (
          <button key={x.k} type="button" data-modelhane-sekme={x.k} onClick={() => setAnaSekme(x.k)}
            style={{ padding: "8px 16px", borderRadius: "var(--erp-r-md)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${anaSekme === x.k ? "var(--erp-purple)" : "var(--erp-border)"}`,
              background: anaSekme === x.k ? "#6B4E8A1A" : "#fff", color: anaSekme === x.k ? "var(--erp-purple)" : "var(--erp-text)" }}>
            {x.ad}
          </button>
        ))}
      </div>

      {anaSekme === "resimler" && (
        <div data-ilham-havuzu="1" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", lineHeight: 1.5 }}>
            İlham havuzu: fuar fotoğrafı, müşteriden gelen görsel, internetten referans. Beğenilen
            resimden <b>Model Yap</b> deyince resim modelin kapak resmi oluyor ve künyesine
            <b> düşünülen taban</b> bilgisi geçiyor.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            {ilhamlar.map((g) => (
              <div key={g.id} data-ilham={g.id} style={{ width: 190, border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
                <img src={g.gorsel} alt={g.not || "ilham"}
                  style={{ width: "100%", height: 150, objectFit: "cover", background: "var(--erp-panel)", display: "block" }} />
                <div style={{ padding: 8, display: "grid", gap: 6 }}>
                  <input value={g.not || ""} data-ilham-not={g.id} placeholder="Not (nereden, kim istedi)"
                    onChange={(e) => modelGuncelle(g.id, { not: e.target.value })}
                    style={{ ...inputStil, fontSize: 11, padding: "4px 6px" }} />
                  {/* DÜŞÜNÜLEN TABAN — kullanıcı: "o modeli hangi tabana düşünüldü bilgisi girelim.
                      Bu önemli." Resim aşamasında girilen taban, model yapılınca künyeye geçiyor. */}
                  <input value={g.taban || ""} data-ilham-taban={g.id} placeholder="Düşünülen taban"
                    onChange={(e) => modelGuncelle(g.id, { taban: e.target.value })}
                    style={{ ...inputStil, fontSize: 11, padding: "4px 6px" }} />
                  <input value={g.modelAdi || ""} data-ilham-ad={g.id} placeholder="Model adı"
                    onChange={(e) => modelGuncelle(g.id, { modelAdi: e.target.value })}
                    style={{ ...inputStil, fontSize: 11, padding: "4px 6px" }} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" className="btn-primary" data-ilham-model-yap={g.id}
                      style={{ flex: 1, padding: "6px 8px", fontSize: 12, justifyContent: "center" }}
                      onClick={() => ilhamdanModelYap(g)}>
                      Model Yap
                    </button>
                    <SilOnayButonu onConfirm={() => onSave((modeller || []).filter((x) => x.id !== g.id))} boyut={11} />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ width: 190 }}>
              <ColorSwatch src="" onUrlSave={(url) => ilhamEkle(url)} size={150} baslik="Resim ekle" />
            </div>
          </div>
        </div>
      )}

      {anaSekme === "modeller" && (
      <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input value={arama} data-model-ara="1" onChange={(e) => setArama(e.target.value)}
          placeholder="Model kodu, ad, sezon, modelci, kalıp…"
          style={{ ...inputStil, flex: "1 1 260px" }} />
        <button className="btn-primary" data-model-yeni="1" onClick={() => setYeniAcik(!yeniAcik)}
          style={{ padding: "8px 14px", fontSize: 13 }}>
          <Plus size={14} /> Yeni Model
        </button>
      </div>

      {yeniAcik && (
        <div data-model-yeni-form="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
          background: "var(--erp-panel)", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12 }}>
          <Field label="Model kodu">
            <input value={yeni.kod} data-model-kod="1" placeholder="boş = otomatik"
              onChange={(e) => setYeni({ ...yeni, kod: e.target.value })} style={{ ...inputStil, width: 130 }} />
          </Field>
          <Field label="Model adı">
            <input value={yeni.ad} data-model-ad="1" placeholder="örn. 512 Bağcıklı Bot"
              onChange={(e) => setYeni({ ...yeni, ad: e.target.value })} style={{ ...inputStil, width: 200 }} />
          </Field>
          <Field label="Sezon">
            <input value={yeni.sezon} data-model-sezon="1" placeholder="2027 Kış"
              onChange={(e) => setYeni({ ...yeni, sezon: e.target.value })} style={{ ...inputStil, width: 120 }} />
          </Field>
          <Field label="Modelci">
            <input value={yeni.modelci} data-model-modelci="1"
              onChange={(e) => setYeni({ ...yeni, modelci: e.target.value })} style={{ ...inputStil, width: 150 }} />
          </Field>
          <button className="btn-primary" data-model-kaydet="1" onClick={modelEkle} style={{ padding: "8px 14px", fontSize: 13 }}>
            Oluştur
          </button>
        </div>
      )}

      {/* AŞAMA SÜZGEÇLERİ — hangi modelin nerede olduğu tek bakışta. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[{ k: false, ad: "Liste" }, { k: true, ad: "Katalog" }].map((g) => (
          <button key={g.ad} type="button" data-model-gorunum={g.k ? "katalog" : "liste"} onClick={() => setKatalogMod(g.k)}
            style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
              border: `1.5px solid ${katalogMod === g.k ? "var(--erp-info)" : "var(--erp-border)"}`,
              background: katalogMod === g.k ? alfaEkle("var(--erp-info)", "1A") : "#fff",
              color: katalogMod === g.k ? "var(--erp-info)" : "var(--erp-text-2)" }}>
            {g.ad}
          </button>
        ))}
      </div>
      <ResimBuyutucu resim={buyukResim} onKapat={() => setBuyukResim(null)} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ key: "acik", ad: "Açık modeller" }, ...MODEL_ASAMALARI, { key: "tumu", ad: "Tümü" }].map((a) => {
          const modelListesi = (modeller || []).filter((m) => m.tip !== "ilham");
          const sayi = a.key === "tumu" ? modelListesi.length
            : a.key === "acik" ? modelListesi.filter((m) => m.asama !== "koleksiyon").length
            : modelListesi.filter((m) => m.asama === a.key).length;
          const secili = asamaSuzgec === a.key;
          return (
            <button key={a.key} type="button" data-model-suzgec={a.key} onClick={() => setAsamaSuzgec(a.key)}
              style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${secili ? (a.renk || "var(--erp-text)") : "var(--erp-border)"}`,
                background: secili ? `${a.renk || "var(--erp-text)"}1A` : "#fff",
                color: secili ? (a.renk || "var(--erp-text)") : "var(--erp-text-2)" }}>
              {a.ad} ({sayi})
            </button>
          );
        })}
      </div>

      {suzulmus.length === 0 ? (
        <EmptyState text={(modeller || []).length === 0
          ? "Henüz model yok. \"Yeni Model\" ile modelhaneyi başlatın."
          : "Bu süzgeçle eşleşen model yok."} />
      ) : katalogMod ? (
        // KATALOG (kullanıcı, 21 Eylül: "modelhaneyi de stoktaki gibi katalog şeklinde
        // listeleyebilelim"). Kapak resmi büyük; resme dokununca büyür, alta dokununca model açılır
        // (liste görünümüne geçip o modeli açık getirir).
        <div data-model-katalog="1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
          {suzulmus.map((m) => {
            const asama = modelAsamasi(m.asama);
            const kapak = m.kapakResmi || ((m.tasarimGorselleri || [])[0] || {}).gorsel || "";
            return (
              <div key={m.id} data-model-katalog-kart={m.kod} style={{ background: "#fff", border: "1px solid var(--erp-border)",
                borderRadius: "var(--erp-r-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div onClick={() => kapak && setBuyukResim({ url: kapak, ad: `${m.kod || ""} ${m.ad || ""}`.trim() })}
                  style={{ aspectRatio: "1 / 1", background: "var(--erp-panel-2)", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: kapak ? "zoom-in" : "default" }}>
                  {kapak
                    ? <img src={kapak} alt={m.ad} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>resim yok</span>}
                </div>
                <button type="button" onClick={() => { setKatalogMod(false); setAcikModelId(m.id); }}
                  style={{ border: "none", background: "none", textAlign: "left", padding: "8px 10px", cursor: "pointer", display: "grid", gap: 3 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{m.kod}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{m.ad || "Adsız model"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: asama.renk }}>{asama.ad}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {suzulmus.map((m) => {
            const asama = modelAsamasi(m.asama);
            const acik = acikModelId === m.id;
            return (
              <div key={m.id} data-model={m.kod} style={{ background: "#fff", border: `1px solid ${acik ? asama.renk : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-md)" }}>
                <button type="button" data-model-ac={m.kod} onClick={() => setAcikModelId(acik ? null : m.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: "none",
                    cursor: "pointer", padding: "10px 12px", textAlign: "left", flexWrap: "wrap" }}>
                  {(m.kapakResmi || (m.tasarimGorselleri || [])[0]) && (
                    <img src={m.kapakResmi || (m.tasarimGorselleri || [])[0].gorsel} alt=""
                      style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "var(--erp-r-md)", border: "1px solid #E4D8C0" }} />
                  )}
                  <b className="mono" style={{ fontSize: 13 }}>{m.kod}</b>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{m.ad}</span>
                  {m.sezon && <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{m.sezon}</span>}
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: asama.renk,
                    background: `${asama.renk}1A`, borderRadius: "var(--erp-r-pill)", padding: "2px 10px" }}>
                    {asama.ad}
                  </span>
                  {acik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {acik && <ModelKarti
                  receteSablonlari={receteSablonlari}
                  onReceteSablonuKaydet={onReceteSablonuKaydet}
                  stok={stok}
                  kurlar={kurlar}
                  onNumuneUretimi={onNumuneUretimi}
                  onNumuneUret={onNumuneUret}
                  model={m}
                  onGuncelle={(alanlar) => modelGuncelle(m.id, alanlar)}
                  onAsamaDegistir={(a) => asamaDegistir(m, a)}
                  onKoleksiyonaAl={() => onKoleksiyonaAl(m)}
                  showToast={showToast}
                  kullaniciYetkisiVar={kullaniciYetkisiVar}
                />}
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}

// Model kartı: künye, tasarım, teknik. Reçete ve numune turları sonraki turda.
function ModelKarti({ model, onGuncelle, onAsamaDegistir, onKoleksiyonaAl, showToast, stok, kurlar, onNumuneUret, onNumuneUretimi, receteSablonlari, onReceteSablonuKaydet }) {
  // Karttaki resimleri büyütme (21 Eylül).
  const [buyukResimKart, setBuyukResimKart] = useState(null);
  const [sekme, setSekme] = useState("kunye");
  const inputStil = { padding: "8px 10px", fontSize: 13, borderRadius: "var(--erp-r-md)", border: "1px solid #C9B99A", background: "#fff" };

  const gorselEkle = (alan, url) => {
    if (!url) return;
    onGuncelle({ [alan]: [...(model[alan] || []), { id: uid("mg"), gorsel: url, baslik: "" }] });
  };
  const gorselSil = (alan, id) => onGuncelle({ [alan]: (model[alan] || []).filter((g) => g.id !== id) });
  const gorselBaslik = (alan, id, baslik) =>
    onGuncelle({ [alan]: (model[alan] || []).map((g) => (g.id === id ? { ...g, baslik } : g)) });

  const gorselSeridi = (alan, etiket) => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{etiket}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        {(model[alan] || []).map((g) => (
          <div key={g.id} data-model-gorsel={g.id} style={{ width: 150, border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
            <img src={g.gorsel} alt={g.baslik || etiket} data-model-gorsel-buyut={g.id}
              onClick={() => setBuyukResimKart({ url: g.gorsel, ad: g.baslik || etiket })}
              style={{ width: "100%", height: 110, objectFit: "contain", background: "var(--erp-panel)", display: "block", cursor: "zoom-in" }} />
            <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <input value={g.baslik || ""} placeholder="Başlık"
                onChange={(e) => gorselBaslik(alan, g.id, e.target.value)}
                style={{ flex: 1, minWidth: 0, border: "none", borderBottom: "1px solid #E4D8C0", fontSize: 11, padding: "2px 0", background: "transparent" }} />
              <SilOnayButonu onConfirm={() => gorselSil(alan, g.id)} boyut={11} />
            </div>
          </div>
        ))}
        <div style={{ width: 150 }}>
          <ColorSwatch src="" onUrlSave={(url) => gorselEkle(alan, url)} size={110} baslik="Ekle" />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ borderTop: "1px solid #E4D8C0", padding: 12, display: "grid", gap: 14 }}>
      <ResimBuyutucu resim={buyukResimKart} onKapat={() => setBuyukResimKart(null)} />
      {/* AŞAMA ŞERİDİ: modelin nerede olduğunu değiştirmenin tek yeri. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Aşama:</span>
        {MODEL_ASAMALARI.filter((a) => a.key !== "koleksiyon").map((a) => (
          <button key={a.key} type="button" data-model-asama={a.key} onClick={() => onAsamaDegistir(a.key)}
            style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${model.asama === a.key ? a.renk : "var(--erp-border-2)"}`,
              background: model.asama === a.key ? `${a.renk}1A` : "#fff",
              color: model.asama === a.key ? a.renk : "var(--erp-text-3)" }}>
            {a.ad}
          </button>
        ))}
        {/* KOLEKSİYONA AL: modelin ürüne dönüştüğü tek kapı. Onaylı numune olmadan üretime
            geçmemek sektörün altını çizdiği kural — onaylı numune üretimin kalite ölçütü. */}
        {model.asama !== "koleksiyon" && (
          <button type="button" className="btn-primary" data-koleksiyona-al={model.kod}
            style={{ marginLeft: "auto", padding: "7px 14px", fontSize: 13 }}
            title={model.asama === "onayli"
              ? "Modeli mamul ürün kartına dönüştür"
              : "Önerilen: onaylı numune sonrası. Yine de devam edebilirsiniz."}
            onClick={() => {
              if (model.asama !== "onayli"
                && !window.confirm("Model henüz \"Onaylı\" aşamasında değil. Onaylı numune, üretimin kalite ölçütüdür. Yine de koleksiyona alınsın mı?")) return;
              onKoleksiyonaAl();
            }}>
            Koleksiyona Al
          </button>
        )}
        {model.asama === "koleksiyon" && (
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--erp-primary-2)" }}>
            {model.urunId ? "Ürün kartı oluşturuldu" : "Koleksiyonda"}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { key: "kunye", ad: "Künye" },
          { key: "tasarim", ad: `Tasarım${(model.tasarimGorselleri || []).length ? ` (${model.tasarimGorselleri.length})` : ""}` },
          { key: "teknik", ad: `Teknik${(model.teknikCizimler || []).length ? ` (${model.teknikCizimler.length})` : ""}` },
          // MODELHANE 2. TUR (20 Eylül): reçete + numune turları.
          { key: "recete", ad: `Reçete${(model.recete || []).length ? ` (${model.recete.length})` : ""}` },
          { key: "numune", ad: `Numune${(model.numuneler || []).length ? ` (${model.numuneler.length})` : ""}` },
          { key: "gecmis", ad: "Geçmiş" },
        ].map((t) => (
          <button key={t.key} type="button" data-model-sekme={t.key} onClick={() => setSekme(t.key)}
            style={{ padding: "6px 12px", borderRadius: "var(--erp-r-md)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${sekme === t.key ? "var(--erp-text)" : "var(--erp-border-2)"}`,
              background: sekme === t.key ? "#F6EEDD" : "#fff", color: "var(--erp-text)" }}>
            {t.ad}
          </button>
        ))}
      </div>

      {sekme === "kunye" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { alan: "ad", etiket: "Model adı", genislik: 200 },
            { alan: "sezon", etiket: "Sezon", genislik: 120 },
            { alan: "modelci", etiket: "Modelci", genislik: 150 },
            { alan: "kalip", etiket: "Kalıp (last)", genislik: 150 },
            { alan: "taban", etiket: "Taban", genislik: 150 },
            { alan: "topuk", etiket: "Topuk", genislik: 110 },
            { alan: "bedenSerisi", etiket: "Beden serisi", genislik: 140 },
            { alan: "hedefMaliyet", etiket: "Hedef maliyet", genislik: 130 },
          ].map((f) => (
            <Field key={f.alan} label={f.etiket}>
              <input value={model[f.alan] || ""} data-model-alan={f.alan}
                onChange={(e) => onGuncelle({ [f.alan]: e.target.value })}
                style={{ ...inputStil, width: f.genislik }} />
            </Field>
          ))}
          <div style={{ flex: "1 1 100%" }}>
            <Field label="Not">
              <textarea value={model.not || ""} data-model-not="1" rows={3}
                onChange={(e) => onGuncelle({ not: e.target.value })}
                placeholder="Modelin hikâyesi, müşteri talebi, referans model…"
                style={{ ...inputStil, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </Field>
          </div>
        </div>
      )}

      {sekme === "tasarim" && gorselSeridi("tasarimGorselleri", "Eskizler ve renderlar")}

      {sekme === "teknik" && (
        <div style={{ display: "grid", gap: 14 }}>
          {gorselSeridi("teknikCizimler", "Teknik çizimler")}
          <Field label="Teknik detaylar (ölçü, malzeme, dikiş, kalıp notu)">
            <textarea value={model.teknikNot || ""} data-model-teknik-not="1" rows={7}
              onChange={(e) => onGuncelle({ teknikNot: e.target.value })}
              placeholder={"Örn.\n• Taban: 4 mm kauçuk, 38 kalıp 265 mm\n• Saya dikişi: 3 mm çift iğne\n• Astar: deri, jarse takviyeli"}
              style={{ ...inputStil, width: "100%", boxSizing: "border-box", lineHeight: 1.6, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
          <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
            Reçete (deri, taban, aksesuar miktarları), numune turları ve numune üretimi sıradaki
            turda bu kartın içine gelecek.
          </div>
        </div>
      )}

      {/* REÇETE (2. tur). Satır yapısı ÜRÜN KARTIYLA AYNI (hammaddeUrunId, renk, miktar, birim,
          proses) — koleksiyona alırken kopyalamak tek adım. Maliyet hammadde kartının SON ALIŞ
          fiyatından; künyedeki hedef maliyetle yan yana: modelci daha çizim aşamasında "bu
          model hedefe sığar mı" görüyor. */}
      {sekme === "recete" && (() => {
        const hammaddeler = (stok || []).filter((u) => u.kategori === "Hammadde" && !u.pasif);
        const satirlar = model.recete || [];
        // PARA BİRİMİ (20 Eylül): USD/EUR alış fiyatı kurla TL'ye.
        // Renk ve boy dahil (21 Eylül) — ürün kartıyla aynı yardımcı.
        const fiyatR = (r) => hammaddeBirimFiyati(hammaddeler.find((u) => u.id === r.hammaddeUrunId), r.renk, r.beden, kurlar).tl;
        const fiyat = (id) => alisFiyatiTL(hammaddeler.find((u) => u.id === id), kurlar);
        const birim = (id) => { const h = hammaddeler.find((u) => u.id === id); return h ? (h.birim || "") : ""; };
        const toplam = satirlar.reduce((t, r) => t + (parseFloat(r.miktar) || 0) * fiyatR(r), 0);
        // Kuru girilmemiş birim (21 Eylül): sessiz kalmasın.
        const kuruEksikler = [...new Set(satirlar.map((r) => alisKuruEksik(hammaddeler.find((u) => u.id === r.hammaddeUrunId), kurlar)).filter(Boolean))];
        const hedef = parseFloat(model.hedefMaliyet) || 0;
        const guncelle = (yeni) => onGuncelle({ recete: yeni });
        return (
          <div data-model-recete="1" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="Hammadde" genislik={220}>
                <select data-model-recete-hammadde="1" defaultValue="" style={inputStil}
                  onChange={(e) => {
                    const h = hammaddeler.find((u) => u.id === e.target.value);
                    if (!h) return;
                    guncelle([...satirlar, { id: uid("mr"), hammaddeUrunId: h.id, hammaddeAd: h.ad, mamulRenk: "", renk: "",
                      beden: "", miktar: 1, birim: h.birim || "", proses: "" }]);
                    e.target.value = "";
                  }}>
                  <option value="">— ekle —</option>
                  {hammaddeler.map((h) => <option key={h.id} value={h.id}>{h.ad}</option>)}
                </select>
              </Field>
              {/* ŞABLONDAN (21 Eylül): standart malzemeleri tek seferde ekle; zaten olanı atla. */}
              <Field label="Şablondan" genislik={200}>
                <select data-model-sablon-sec="1" defaultValue="" style={inputStil}
                  onChange={(e) => {
                    const sb = (receteSablonlari || []).find((x) => x.id === e.target.value);
                    e.target.value = "";
                    if (!sb) return;
                    const yeniler = (sb.satirlar || []).filter((sa) => !satirlar.some((r) => r.hammaddeUrunId === sa.hammaddeUrunId
                      && (r.renk || "") === (sa.renk || "") && (r.beden || "") === (sa.beden || "") && (r.proses || "") === (sa.proses || "")))
                      .map((sa) => ({ id: uid("mr"), hammaddeUrunId: sa.hammaddeUrunId, hammaddeAd: sa.hammaddeAd, mamulRenk: "",
                        renk: sa.renk || "", beden: sa.beden || "", miktar: sa.miktar, birim: sa.birim || "", proses: sa.proses || "" }));
                    if (yeniler.length === 0) { showToast && showToast("Şablondaki malzemelerin hepsi zaten reçetede"); return; }
                    guncelle([...satirlar, ...yeniler]);
                    showToast && showToast(`"${sb.ad}" şablonundan ${yeniler.length} malzeme eklendi`);
                  }}>
                  <option value="">— şablon —</option>
                  {(receteSablonlari || []).map((sb) => <option key={sb.id} value={sb.id}>{sb.ad}</option>)}
                </select>
              </Field>
              {satirlar.length > 0 && onReceteSablonuKaydet && (
                <button type="button" className="btn-ghost" data-model-sablon-kaydet="1" style={{ fontSize: 12, padding: "6px 10px", alignSelf: "flex-end" }}
                  onClick={() => {
                    const ad = window.prompt("Şablon adı:", "");
                    if (!ad || !ad.trim()) return;
                    onReceteSablonuKaydet({ id: uid("rsab"), ad: ad.trim(), satirlar: satirlar.map((r) => ({ id: uid("ss"),
                      hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, renk: r.renk || "Standart", beden: r.beden || "Standart",
                      miktar: parseFloat(r.miktar) || 0, birim: r.birim || "", proses: r.proses || "" })) });
                    showToast && showToast(`"${ad.trim()}" şablonu kaydedildi`);
                  }}>
                  Şablon olarak kaydet
                </button>
              )}
              <span style={{ fontSize: 11, color: "var(--erp-text-3)", alignSelf: "center" }}>
                Miktar bir çift içindir.
              </span>
            </div>
            {satirlar.length === 0 ? (
              <EmptyState text="Reçete boş. Deri, taban, aksesuar ekleyin — maliyet kendiliğinden çıkar." />
            ) : (
              <div style={{ border: "1px solid var(--erp-border)", overflow: "hidden" }}>
                {satirlar.map((r) => {
                  const f = fiyatR(r);
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                      borderBottom: "1px solid var(--erp-border-2)", flexWrap: "wrap" }}>
                      <span style={{ flex: "1 1 160px", fontWeight: 700, fontSize: 13 }}>{r.hammaddeAd}</span>
                      <input value={r.renk || ""} placeholder="renk"
                        onChange={(e) => guncelle(satirlar.map((x) => (x.id === r.id ? { ...x, renk: e.target.value } : x)))}
                        style={{ ...inputStil, width: 100, padding: "4px 8px", fontSize: 12 }} />
                      <input type="number" min="0" step="any" value={r.miktar}
                        onChange={(e) => guncelle(satirlar.map((x) => (x.id === r.id ? { ...x, miktar: e.target.value } : x)))}
                        style={{ ...inputStil, width: 80, padding: "4px 8px", fontSize: 12, textAlign: "right", fontWeight: 700 }} />
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", minWidth: 40 }}>{r.birim || birim(r.hammaddeUrunId)}</span>
                      <span className="mono" style={{ fontSize: 12, minWidth: 110, textAlign: "right", color: "var(--erp-text-2)" }}>
                        {f > 0 ? `${(f * (parseFloat(r.miktar) || 0)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺` : "fiyat yok"}
                      </span>
                      <SilOnayButonu onConfirm={() => guncelle(satirlar.filter((x) => x.id !== r.id))} />
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px",
                  background: "var(--erp-panel-2)", fontSize: 13, fontWeight: 700 }}>
                  <span>Hammadde maliyeti (bir çift)</span>
                  <span className="mono" data-model-recete-toplam="1">
                    {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                    {hedef > 0 && (
                      <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700,
                        color: toplam <= hedef ? "var(--erp-primary)" : "var(--erp-danger)" }}>
                        hedef {hedef.toLocaleString("tr-TR")} ₺ · {toplam <= hedef ? "sığıyor" : `${(toplam - hedef).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ aşıyor`}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            {kuruEksikler.length > 0 && (
              <div data-kur-eksik="1" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-void)",
                background: "var(--erp-void-tint)", padding: "6px 10px", borderRadius: "var(--erp-r-sm)" }}>
                {kuruEksikler.join(", ")} kuru girilmemiş — bu birimdeki fiyatlar çevrilmeden sayıldı, maliyet eksik.
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
              İşçilik ve genel gider burada yok; onlar koleksiyona alındıktan sonra ürün kartında hesaplanır.
            </div>
          </div>
        );
      })()}

      {/* NUMUNE TURLARI (2. tur). Sektör pratiği: proto → geliştirme → onaylı (sealed sample).
          Her turun fotoğrafı, yorumu ve KARARI var. "Onay" kararı verilince aşama "onaylı"ya
          geçiyor — onaylı numune üretimin kalite ölçütü, aşamayla kopuk kalamaz. */}
      {sekme === "numune" && (() => {
        const turlar = model.numuneler || [];
        const TUR_ADLARI = { proto: "Proto", gelistirme: "Geliştirme", onayli: "Onaylı numune" };
        const KARARLAR = { devam: "Devam — sonraki tur", revizyon: "Revizyon gerekli", onay: "Onaylandı" };
        const ekle = () => onGuncelle({ numuneler: [...turlar, { id: uid("nm"), no: turlar.length + 1,
          tur: turlar.length === 0 ? "proto" : "gelistirme", tarih: new Date().toISOString().slice(0, 10),
          foto: "", yorum: "", karar: "" }] });
        const guncelle = (id, alanlar) => onGuncelle({ numuneler: turlar.map((n) => (n.id === id ? { ...n, ...alanlar } : n)) });
        return (
          <div data-model-numune="1" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="btn-ghost" data-model-numune-ekle="1" onClick={ekle}
                style={{ fontSize: 12, padding: "5px 12px" }}>
                <Plus size={12} /> Numune turu aç ({turlar.length + 1}. tur)
              </button>
              {/* NUMUNE ÜRETİMİ (3. tur): üretim modülünde emir açar — hammadde düşer, mamul
                  stoğuna girmez. Reçete boşsa üretilecek bir şey yok, düğme pasif. */}
              {onNumuneUretimi && (
                <button type="button" className="btn-primary" data-model-numune-emir="1"
                  disabled={(model.recete || []).length === 0}
                  title={(model.recete || []).length === 0 ? "Önce reçete girin" : "Atölye emri: proses takibi ve işçilikle numune üretimi. Turun içindeki 'Üret' ise stoktan hemen düşer."}
                  onClick={() => onNumuneUretimi(model)}
                  style={{ fontSize: 12, padding: "5px 12px" }}>
                  <Hammer size={12} /> Atölyede numune emri aç
                </button>
              )}
            </div>
            {turlar.length === 0 && <EmptyState text="Henüz numune turu yok. İlk tur proto olur." />}
            {turlar.map((n) => (
              <div key={n.id} data-model-numune-turu={n.no} style={{ border: "1px solid var(--erp-border)", padding: 10,
                display: "grid", gap: 8, background: n.karar === "onay" ? "var(--erp-orange-bg)" : "#fff" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <b style={{ fontSize: 13 }}>{n.no}. tur</b>
                  <select value={n.tur} onChange={(e) => guncelle(n.id, { tur: e.target.value })} style={{ ...inputStil, padding: "4px 8px", fontSize: 12 }}>
                    {Object.entries(TUR_ADLARI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="date" value={n.tarih || ""} onChange={(e) => guncelle(n.id, { tarih: e.target.value })}
                    style={{ ...inputStil, padding: "4px 8px", fontSize: 12 }} />
                  <select value={n.karar || ""} data-model-numune-karar={n.no}
                    onChange={(e) => {
                      const karar = e.target.value;
                      guncelle(n.id, { karar });
                      if (karar === "onay" && model.asama !== "onayli" && model.asama !== "koleksiyon") onAsamaDegistir("onayli");
                    }}
                    style={{ ...inputStil, padding: "4px 8px", fontSize: 12, marginLeft: "auto",
                      color: n.karar === "onay" ? "var(--erp-primary)" : n.karar === "revizyon" ? "var(--erp-danger)" : "inherit", fontWeight: 700 }}>
                    <option value="">— karar —</option>
                    {Object.entries(KARARLAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* NUMUNE ÜRETİMİ (3. tur): hammadde reçeteden düşer, mamul stoğuna girmez.
                    Kullanıcı: "numune tek de üretilebiliyor, 1/2 çift" — miktar 0,5 seçilebilir. */}
                {n.uretim ? (
                  <div className="mono" style={{ fontSize: 12, color: "var(--erp-primary-2)", background: "var(--erp-panel-2)",
                    padding: "6px 10px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <b>Üretildi</b> {n.uretim.miktar} çift{n.uretim.beden ? ` · ${n.uretim.beden}` : ""}
                    <span>fiş {n.uretim.fisNo}</span>
                    <span>hammadde {(n.uretim.maliyet || 0).toLocaleString("tr-TR")} ₺</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
                    border: "1px dashed var(--erp-border)", padding: "8px 10px" }}>
                    <Field label="Miktar (çift)" genislik={130}>
                      <select value={n.uretimMiktar || "0.5"} data-model-numune-miktar={n.no}
                        onChange={(e) => guncelle(n.id, { uretimMiktar: e.target.value })}
                        style={{ ...inputStil, padding: "4px 8px", fontSize: 12 }}>
                        <option value="0.5">½ çift (tek ayak)</option>
                        <option value="1">1 çift</option>
                        <option value="2">2 çift</option>
                      </select>
                    </Field>
                    <Field label="Beden" genislik={90}>
                      <input value={n.uretimBeden || ""} placeholder="37"
                        onChange={(e) => guncelle(n.id, { uretimBeden: e.target.value })}
                        style={{ ...inputStil, padding: "4px 8px", fontSize: 12 }} />
                    </Field>
                    <button type="button" className="btn-primary" data-model-numune-uret={n.no}
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => onNumuneUret && onNumuneUret(model, n.id, { miktar: n.uretimMiktar || "0.5", beden: n.uretimBeden || "" })}>
                      Numune üret — hammadde düş
                    </button>
                    <span style={{ fontSize: 10, color: "var(--erp-text-3)", flex: "1 1 160px" }}>
                      Reçete × miktar kadar hammadde stoktan çıkar; mamul stoğuna girmez, kendi fişi olur (NUM).
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ColorSwatch src={n.foto || ""} onUrlSave={(url) => guncelle(n.id, { foto: url })} size={110} baslik="Fotoğraf" />
                  <textarea value={n.yorum || ""} placeholder="Ne görüldü, ne değişecek…"
                    onChange={(e) => guncelle(n.id, { yorum: e.target.value })}
                    style={{ ...inputStil, flex: "1 1 240px", minHeight: 80, fontSize: 12, resize: "vertical" }} />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {sekme === "gecmis" && (
        <div style={{ display: "grid", gap: 4 }}>
          {[...(model.gecmis || [])].reverse().map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, borderBottom: "1px solid #F2E8D8", padding: "4px 0" }}>
              <span className="mono" style={{ color: "var(--erp-text-3)" }}>{tarihYaz(g.zaman)}</span>
              <span>{g.olay}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
