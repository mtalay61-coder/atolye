   Aynı renk farklı ürünlerde farklı görsellerle gösterilebilir. */

function fileToCompressedDataUrl(file, maxWidth = 480, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// `baslik`: kutunun neyin görseli olduğunu söyleyen ipucu. Varsayılan metin "bu ÜRÜNÜN rengine
// görsel ekle" diyordu; bileşen artık çek fotoğrafı gibi başka yerlerde de kullanılıyor ve orada
// yanlış bilgi veriyordu.
function ColorSwatch({ src, onUrlSave, onRemove, size = 30, editable = true, baslik }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");
  // GALERİ VE KAMERA — iki AYRI gizli dosya girdisi.
  //
  // Fark tek bir öznitelikte: `capture="environment"` olan girdi telefonda doğrudan KAMERAYI açar,
  // olmayan galeriyi. Tek girdiyle iki düğme yapılamıyor; tarayıcı özniteliği tıklama anında değil,
  // girdinin kendisinden okuyor. Masaüstünde `capture` yok sayılır ve normal dosya seçici açılır —
  // düğmeyi gizlemeye gerek yok, en kötü ihtimalle galeriyle aynı işi yapar.
  const galeriRef = React.useRef(null);
  const kameraRef = React.useRef(null);

  function save() {
    onUrlSave(draft.trim());
    setEditing(false);
  }

  // Seçilen/çekilen fotoğraf küçültülüp veri URL'sine çevrilir. Ham telefon fotoğrafı 3-8 MB;
  // olduğu gibi saklamak depo sınırını tek üründe doldururdu (bkz. DEPO_SINIRI).
  async function dosyaSecildi(e) {
    const dosya = e.target.files && e.target.files[0];
    // Girdi HER SEFERİNDE temizlenir: aynı fotoğrafı ikinci kez seçince `change` olayı
    // tetiklenmiyor, kullanıcı "bir şey olmadı" sanıyordu.
    e.target.value = "";
    if (!dosya) return;
    setBusy(true);
    setHata("");
    try {
      const dataUrl = await fileToCompressedDataUrl(dosya);
      // Küçültme oranı kullanıcıya söylenir. Görseller ürün kaydının İÇİNDE saklanıyor ve o kaydın
      // bir boyut sınırı var; "3,8 MB → 46 KB" görmek, sınıra yaklaşıldığında sebebi anlaşılır kılar.
      setBilgi(`${boyutMetni(dosya.size)} → ${boyutMetni(new Blob([dataUrl]).size)}`);
      onUrlSave(dataUrl);
      setEditing(false);
    } catch (err) {
      // Sessizce yutmak yok: kullanıcı düğmeye bastı, bir cevap hak ediyor.
      setHata("Fotoğraf okunamadı. Başka bir görsel deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        setBusy(true);
        try {
          const dataUrl = await fileToCompressedDataUrl(file);
          onUrlSave(dataUrl);
          setEditing(false);
        } catch (err) {
          // sessizce yoksay
        } finally {
          setBusy(false);
        }
        return;
      }
    }
  }

  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle", marginRight: 6 }}>
      <button
        type="button"
        disabled={!editable}
        onClick={() => {
          if (!editable) return;
          setDraft(src || "");
          setEditing((v) => !v);
        }}
        title={!editable ? "" : (baslik || (src ? "Görseli değiştir" : "Bu ürünün rengine görsel ekle"))}
        style={{
          width: size, height: size, borderRadius: "var(--erp-r-md)", border: "1px solid var(--erp-line)",
          overflow: "hidden", padding: 0, cursor: editable ? "pointer" : "default",
          background: src ? "transparent" : "#EFE4CE",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <ImageIcon size={14} color="var(--erp-text-3)" />
        )}
      </button>

      {src && onRemove && editable && !editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Görseli kaldır"
          style={{
            position: "absolute", top: -6, right: -6, width: 14, height: 14, borderRadius: "50%",
            background: "#4B3625", color: "var(--erp-panel-2)", border: "none", fontSize: 9, lineHeight: "14px",
            cursor: "pointer", padding: 0, zIndex: 2,
          }}
        >
          ×
        </button>
      )}

      {editing && (
        <div
          style={{
            position: "absolute", top: size + 6, left: 0, zIndex: 20, background: "#fff",
            border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, width: 260,
            boxShadow: "none",
          }}
        >
          <input
            ref={galeriRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={dosyaSecildi}
          />
          <input
            ref={kameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={dosyaSecildi}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              style={{ flex: 1, padding: "8px 6px", fontSize: 12, justifyContent: "center" }}
              onClick={() => galeriRef.current && galeriRef.current.click()}
            >
              <ImageIcon size={13} /> Galeriden
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              style={{ flex: 1, padding: "8px 6px", fontSize: 12, justifyContent: "center" }}
              onClick={() => kameraRef.current && kameraRef.current.click()}
            >
              <Camera size={13} /> Fotoğraf Çek
            </button>
          </div>
          {busy && (
            <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8 }}>Fotoğraf küçültülüyor…</div>
          )}
          {hata && (
            <div style={{ fontSize: 11, color: "var(--erp-warn)", marginBottom: 8, fontWeight: 600 }}>{hata}</div>
          )}
          {bilgi && !busy && (
            <div style={{ fontSize: 10, color: "var(--erp-text-2)", marginBottom: 8 }}>Küçültüldü: {bilgi}</div>
          )}

          <div style={{ fontSize: 11, color: "var(--erp-text)", marginBottom: 6, fontWeight: 700 }}>
            Ya da kopyala-yapıştır
          </div>
          <div style={{ fontSize: 10, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.45 }}>
            Fotoğraflar uygulamasında resme basılı tutup <b>Kopyala</b>'yı seçin, sonra aşağıdaki kutuya
            uzun basıp <b>Yapıştır</b> deyin.
          </div>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={handlePaste}
            placeholder={busy ? "Yükleniyor…" : "Buraya yapıştırın (resim veya link)"}
            disabled={busy}
            style={{ ...inputStyle, fontSize: 12, padding: "8px 10px", borderColor: "var(--erp-orange)", borderWidth: 1.5 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 8, lineHeight: 1.4 }}>
            Link yapıştırdıysanız Kaydet'e basın. Fotoğraf yapıştırırsanız otomatik kaydedilir.
            Link için imgur.com veya postimages.org gibi siteler doğrudan çalışan bağlantı verir
            (Google Fotoğraflar/Drive linkleri çoğunlukla çalışmaz).
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={save}>
              Kaydet
            </button>
            <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditing(false)}>
              Vazgeç
            </button>

          </div>
        </div>
      )}
    </span>
  );
}

/* ================= TANIMLAR MODÜLÜ (Renk & Beden İsim Listesi) =================
   Burada sadece isimler tanımlanır (seçim için). Görsel burada tutulmaz. */

function KullanimGosterge({ urunler }) {
  const [acik, setAcik] = useState(false);
  if (!urunler || urunler.length === 0) return null;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setAcik((v) => !v); }}
        title="Hangi stok kartlarında kullanıldığını gör"
        className="mono"
        style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
          border: "1px solid #3D6B8A", background: "#3D6B8A22", color: "var(--erp-info)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 3,
        }}
      >
        <Boxes size={10} /> {urunler.length} üründe
      </button>
      {acik && (
        <div
          style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 20,
            background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 8,
            boxShadow: "none", minWidth: 160, maxWidth: 260,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 4, textTransform: "uppercase" }}>
            Kullanıldığı stok kartları
          </div>
          <div style={{ display: "grid", gap: 3 }}>
            {urunler.map((ad, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 600 }}>{ad}</div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

function TanimListesi({ adIpucu, list, onRemove, emptyText, mono, defaultOpen, onRenkKoduChange, onRenkTonKoduChange, onAdDegistir, bagliKombinasyonSayisi, kullanimGetir, hammaddeTipleri, onMalzemeTipiToggle, barkodKodu }) {
  const [open, setOpen] = useState(!!defaultOpen);
  // SÜTUN FİLTRESİ — başlık satırının altında, her sütun kendi kutusuyla süzülür.
  // Üstteki malzeme tipi çipleri "hangi gruba bakıyorum", bu satır ise "o grupta neyi arıyorum"
  // sorusunu çözer; ikisi birlikte çalışır.
  // Filtre YALNIZCA listeyi kısar, kayıtlara dokunmaz — süzülen bir satırdaki kod/tip düzenlemesi
  // normal şekilde kaydedilir.
  const [kolonFiltre, setKolonFiltre] = useState({ ad: "", kod: "", tip: "" });
  const filtreAktif = Object.values(kolonFiltre).some((v) => v.trim() !== "");

  // Sütun filtresi ancak liste UZUNSA anlamlıdır. Kısa listelerde ekstra bir arama satırı, faydadan
  // çok gürültü olurdu — bu yüzden eşiğin altında hiç gösterilmez.
  const filtreEsigi = 8;
  const filtreliMi = list.length >= filtreEsigi || filtreAktif;

  const esle = (metin, aranan) =>
    String(metin || "").toLocaleLowerCase("tr-TR").includes(aranan.trim().toLocaleLowerCase("tr-TR"));

  const gorunen = !filtreAktif ? list : list.filter((item) => {
    if (kolonFiltre.ad.trim() && !esle(item.ad, kolonFiltre.ad)) return false;
    if (kolonFiltre.kod.trim() && !esle(item.kod, kolonFiltre.kod)) return false;
    if (kolonFiltre.tip.trim()) {
      const tipMetni = renkTipleri(item).join(" ") || "Genel";
      if (!esle(tipMetni, kolonFiltre.tip)) return false;
    }
    return true;
  });

  const filtreKutusu = (alan, ipucu, genislik) => (
    <input
      value={kolonFiltre[alan]}
      onChange={(e) => setKolonFiltre({ ...kolonFiltre, [alan]: e.target.value })}
      placeholder={ipucu}
      className="mono"
      style={{
        width: genislik, padding: "3px 6px", fontSize: 11, boxSizing: "border-box",
        border: `1px solid ${kolonFiltre[alan].trim() ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
        background: kolonFiltre[alan].trim() ? "var(--erp-hover)" : "#fff",
        borderRadius: "var(--erp-r-sm)",
      }}
    />
  );

  if (list.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "var(--erp-panel)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--erp-text)",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span>
          {filtreAktif ? `${gorunen.length} / ${list.length} tanımlı öğe` : `${list.length} tanımlı öğe`}
        </span>
        {open ? <ChevronDown size={15} color="var(--erp-text-3)" /> : <ChevronRight size={15} color="var(--erp-text-3)" />}
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
          {onRenkTonKoduChange && (
            <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: "var(--erp-panel-2)", borderBottom: "1px solid var(--erp-line-soft)" }}>
              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "var(--erp-text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>Renk</span>
              <span style={{ width: 100, fontSize: 10, fontWeight: 700, color: "var(--erp-text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>Renk Kodu</span>
              {onMalzemeTipiToggle && <span style={{ width: 130, marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--erp-text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>Tip</span>}
              <span style={{ width: 22 }} />
            </div>
          )}

          {filtreliMi && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "5px 12px", background: "var(--erp-panel)", borderBottom: "1px solid var(--erp-line-soft)" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Search size={12} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
                {filtreKutusu("ad", "ada göre ara…", "100%")}
              </span>
              {onRenkTonKoduChange && filtreKutusu("kod", "kod…", 100)}
              {onMalzemeTipiToggle && <span style={{ marginLeft: 6 }}>{filtreKutusu("tip", "tip…", 120)}</span>}
              <span style={{ width: 22, display: "flex", justifyContent: "center" }}>
                {filtreAktif && (
                  <button
                    type="button"
                    onClick={() => setKolonFiltre({ ad: "", kod: "", tip: "" })}
                    title="Filtreleri temizle"
                    className="btn-ikon"
                    style={{ padding: 2 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            </div>
          )}

          {gorunen.length === 0 && (
            <div style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, color: "var(--erp-text-3)" }}>
              Bu filtreyle eşleşen kayıt yok.
            </div>
          )}
          {gorunen.map((item, i) => (
            <div
              key={item.id}
              className={mono ? "mono" : undefined}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", fontSize: 14, fontWeight: 600,
                borderBottom: i < gorunen.length - 1 ? "1px solid var(--erp-line-soft)" : "none",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                {onRenkKoduChange && (
                  <input
                    type="color"
                    value={item.renkKodu || "#C9B99A"}
                    onChange={(e) => onRenkKoduChange(item.id, e.target.value)}
                    title="Renk tonunu (görsel) değiştir"
                    style={{
                      width: 20, height: 20, padding: 0, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)",
                      cursor: "pointer", background: "none", flexShrink: 0,
                    }}
                  />
                )}
                {onAdDegistir ? (
                  <input
                    defaultValue={item.ad}
                    key={item.id + "-" + item.ad}
                    onBlur={(e) => {
                      const yeni = e.target.value.trim();
                      if (yeni && yeni !== item.ad) onAdDegistir(item.id, yeni);
                      else e.target.value = item.ad;
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                    title={adIpucu || "Adı değiştirmek için tıklayıp düzenleyin — bağlı kayıtlar otomatik güncellenir"}
                    style={{
                      border: "1px solid transparent", background: "transparent", fontSize: 14, fontWeight: 600,
                      color: "var(--erp-text)", padding: "2px 4px", borderRadius: "var(--erp-r-sm)", minWidth: 0, flex: 1,
                    }}
                    onFocus={(e) => { e.target.style.border = "1px solid var(--erp-line)"; e.target.style.background = "#fff"; }}
                  />
                ) : (
                  item.ad
                )}
              </span>
              {/* BARKOD KODU — kullanıcı kararı: "Bu işleri kullanıcı da görsün ama değiştiremesin."
                  Salt okunur, çünkü kodu elle değiştirmek basılmış etiketi bir anda yanlış kayda
                  bağlar. Yandaki ton kodundan (serbest metin, düzenlenebilir) ayrı bir şey. */}
              {barkodKodu ? (
                <span
                  className="mono"
                  title={`${barkodKodu.ad} — sistem atar, değiştirilemez. Barkodun içinde bu numara geçiyor.`}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-sm)",
                    border: "1px solid #D9E2E9", background: "#EEF4F8",
                    color: item.barkodKodu ? "var(--erp-info)" : "var(--erp-warn)", flexShrink: 0, marginRight: 6,
                  }}
                >
                  {item.barkodKodu
                    ? `${barkodKodu.ad}: ${String(item.barkodKodu).padStart(barkodKodu.hane, "0")}`
                    : `${barkodKodu.ad} yok`}
                </span>
              ) : null}
              {onRenkTonKoduChange && (
                <input
                  value={item.kod || ""}
                  onChange={(e) => onRenkTonKoduChange(item.id, e.target.value)}
                  placeholder="örn. 101"
                  className="mono"
                  title="Aynı isimli farklı tonları ayırt etmek için serbest bir kod girin"
                  style={{
                    width: 100, fontSize: 12, fontWeight: 600, padding: "4px 7px",
                    border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", color: "var(--erp-text)", background: "#fff",
                  }}
                />
              )}
              {/* ÇOKLU MALZEME TİPİ — tek seçimli açılır liste yerine üyelik rozetleri.
                  Bir renk birden fazla türde kullanılabilir ("Kahve" hem astar hem taban).
                  Rozete tıklamak tipi ekler/çıkarır; hiç tip seçilmezse renk "Genel"dir ve her
                  malzeme tipinde listelenir. */}
              {onMalzemeTipiToggle && (() => {
                const seciliTipler = renkTipleri(item);
                return (
                  <span style={{ display: "flex", gap: 3, flexWrap: "wrap", marginLeft: 6, width: 130 }}>
                    {seciliTipler.length === 0 && (
                      <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", alignSelf: "center" }} title="Hiç tip seçilmedi — bu renk her malzeme tipinde kullanılabilir">
                        Genel
                      </span>
                    )}
                    {(hammaddeTipleri || []).map((h) => {
                      const secili = seciliTipler.includes(h.ad);
                      // Seçili olmayan tipler soluk gösterilir ama GİZLENMEZ: eklemek için ayrı bir
                      // menü açmak gerekmesin, tek tıkla üyelik değiştirilebilsin.
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => onMalzemeTipiToggle(item.id, h.ad)}
                          className="mono"
                          title={secili ? `"${h.ad}" tipinden çıkar` : `"${h.ad}" tipine ekle`}
                          style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                            border: `1px solid ${secili ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
                            background: secili ? "var(--erp-brown)" : "#fff",
                            color: secili ? "#fff" : "var(--erp-border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.ad}
                        </button>
                      );
                    })}
                  </span>
                );
              })()}
              {kullanimGetir && <KullanimGosterge urunler={kullanimGetir(item.id)} />}
              {(() => {
                const bagliSayi = bagliKombinasyonSayisi ? bagliKombinasyonSayisi(item.id) : 0;
                if (bagliSayi > 0) {
                  return (
                    <span style={{ marginLeft: 8 }}>
                      <SilOnayButonu
                        onConfirm={() => onRemove(item.id)}
                        boyut={14}
                        baslikNormal={`Bu renk ${bagliSayi} model renginde kullanılıyor — silinirse onlar da kaldırılır`}
                        baslikOnay="Emin misiniz? Tekrar dokunun"
                      />
                    </span>
                  );
                }
                return (
                  <button
                    onClick={() => onRemove(item.id)}
                    style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex", padding: 4, marginLeft: 8 }}
                  >
                    <X size={14} />
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bolum({ baslik, renk, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: renk || "var(--erp-text)", marginBottom: 6 }}>{baslik}</div>
      {children}
    </div>
  );
}

