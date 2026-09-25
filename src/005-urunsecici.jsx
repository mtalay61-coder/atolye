// Kategori ikonları. Ürün görseli yüklenmemişse listede boş bir kare kalıyordu; kategori ikonu
// hem o boşluğu dolduruyor hem de satırın ne olduğunu okumadan ayırt ettiriyor.
// İkonlar anlamla seçildi: hammadde = katman/tabaka, yarı mamul = makas (işlenmiş ama bitmemiş),
// mamul = paketlenmiş kutu, hizmet = el aleti.
// Aramalı ürün seçici. Açılır liste, stok büyüdükçe kullanılamaz hale geliyor: 200 kalem arasından
// "Çelikli Taban"ı bulmak için listede kaydırmak gerekiyor ve seçenekler yalnızca ada göre sıralı.
//
// Bu bileşen yazarak süzer; ada, koda ve malzeme tipine göre eşleşir. Klavyeyle kullanılabilir
// (yukarı/aşağı/Enter/Escape) çünkü reçete girişi seri bir iştir, fareye uzanmak yavaşlatır.
function AramaliUrunSecici({ urunler, seciliId, onSec, placeholder, oncelikliProses, onHizliUrunEkle, ozelKodAlanlari }) {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [vurgulu, setVurgulu] = useState(0);

  const secili = urunler.find((u) => u.id === seciliId) || null;
  const q = sorgu.trim().toLocaleLowerCase("tr-TR");

  const sonuclar = (() => {
    const eslesir = (u) => {
      if (!q) return true;
      // ÖZEL KODLAR da havuzda: hem ETİKET hem DEĞER. Stok ekranında zaten böyle aranıyordu ve
      // ikisinin ayrı davranması, "taban 147'yi Stok'ta buluyorum ama siparişte bulamıyorum"
      // demekti. Etiketler `tanimlar`dan geliyor; verilmezse yalnız değerler aranır — seçici
      // etiketsiz de çalışmaya devam etsin.
      const havuz = `${u.ad} ${u.kod || ""} ${u.malzemeTipi || ""} ${u.mamulTipi || ""} ${ozelKodMetni(u, ozelKodAlanlari)}`.toLocaleLowerCase("tr-TR");
      return havuz.includes(q);
    };
    const liste = urunler.filter((u) => (!u.pasif || u.id === seciliId) && eslesir(u));
    // Seçili prosese ait varsayılan hammaddeler üste alınır: "Kesim" prosesindeyken deri ve astar
    // önce gelir. Aranan hammadde çoğunlukla o gruptandır, listenin başında olması aramayı kısaltır.
    // En fazla 40 sonuç: daha uzun bir liste kaydırma gerektirir ve aramanın amacını boşa çıkarır.
    if (!oncelikliProses) return liste.slice(0, 40);
    return [
      ...liste.filter((u) => (u.varsayilanProses || "") === oncelikliProses),
      ...liste.filter((u) => (u.varsayilanProses || "") !== oncelikliProses),
    ].slice(0, 40);
  })();

  function sec(u) {
    onSec(u.id);
    setSorgu("");
    setAcik(false);
    setVurgulu(0);
  }

  // AÇILIR LİSTE YER YOKSA YUKARI AÇILIR.
  //
  // Liste, ürün kartının içinde ve o kart KAYDIRILABİLİR bir pencerenin içinde duruyor. Aşağı
  // doğru açıldığında pencerenin alt kenarı listeyi kesiyordu: kullanıcı ilk bir buçuk satırı
  // görüp gerisini hiç göremiyordu ("ekran tam olmuyor"). Kaydırma kabını `overflow: visible`
  // yapmak çözüm değil — o kap zaten kaydırmak için var.
  //
  // Ölçüm AÇILIRKEN yapılır (her karede değil): kutunun altında kalan boşluk, hem pencerenin hem
  // ekranın alt kenarına göre hesaplanır; dar geliyorsa liste yukarı açılır ve yüksekliği
  // kullanılabilir alana göre kısılır.
  const sarmalayiciRef = React.useRef(null);
  const [yerlesim, setYerlesim] = React.useState({ yukari: false, maksYukseklik: 260 });

  React.useEffect(() => {
    if (!acik || !sarmalayiciRef.current) return;
    const kutu = sarmalayiciRef.current.getBoundingClientRect();
    // En yakın kaydırılabilir/kırpan ata: listeyi gerçekten kesecek olan kap odur.
    let sinirUst = 0;
    let sinirAlt = window.innerHeight;
    let p = sarmalayiciRef.current.parentElement;
    while (p) {
      const st = window.getComputedStyle(p);
      if (st.overflow !== "visible" || st.overflowY !== "visible") {
        const r = p.getBoundingClientRect();
        sinirUst = Math.max(sinirUst, r.top);
        sinirAlt = Math.min(sinirAlt, r.bottom);
        break;
      }
      p = p.parentElement;
    }
    const altBosluk = sinirAlt - kutu.bottom - 8;
    const ustBosluk = kutu.top - sinirUst - 8;
    // Yukarı açmak yalnızca aşağısı DAR ve yukarısı DAHA GENİŞ ise: aksi halde liste ekranın
    // üstüne yapışıp okunmaz hale gelirdi.
    const yukari = altBosluk < 160 && ustBosluk > altBosluk;
    setYerlesim({
      yukari,
      maksYukseklik: Math.max(120, Math.min(260, yukari ? ustBosluk : altBosluk)),
    });
  }, [acik]);

  return (
    <div ref={sarmalayiciRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%", boxSizing: "border-box",
          padding: "6px 8px", borderRadius: "var(--erp-r-md)", border: `1px solid ${acik ? "var(--erp-brown)" : "var(--erp-border)"}`, background: "#fff",
        }}
      >
        <Search size={13} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
        <input
          value={acik ? sorgu : (secili ? secili.ad : "")}
          onChange={(e) => { setSorgu(e.target.value); setAcik(true); setVurgulu(0); }}
          onFocus={() => { setAcik(true); setSorgu(""); }}
          onBlur={() => setTimeout(() => setAcik(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAcik(true); setVurgulu((v) => Math.min(v + 1, sonuclar.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setVurgulu((v) => Math.max(v - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (sonuclar[vurgulu]) sec(sonuclar[vurgulu]); }
            else if (e.key === "Escape") { setAcik(false); setSorgu(""); }
          }}
          placeholder={placeholder || "Ara veya seç…"}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, padding: 0 }}
        />
        {secili && !acik && (
          <button
            type="button"
            onClick={() => { onSec(""); setSorgu(""); }}
            title="Seçimi temizle"
            className="btn-ikon"
            style={{ padding: 1, flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {acik && (
        <div
          style={{
            // Liste, arama kutusundan GENİŞ olabilir: kutu dar bir sütunda dursa bile ürün adları
            // sığmalı. `right: 0` yerine minWidth kullanılıyor — kutuyu taşıyıp sağa doğru açılır.
            position: "absolute", left: 0, zIndex: 60,
            ...(yerlesim.yukari ? { bottom: "calc(100% + 3px)" } : { top: "calc(100% + 3px)" }),
            minWidth: "100%", width: "max-content", maxWidth: 420,
            background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)",
            boxShadow: "none",
            maxHeight: yerlesim.maksYukseklik, overflowY: "auto",
          }}
        >
          {/* ARADIĞI ÜRÜN YOKSA BURADAN AÇILIR.
              Reçete kurarken eksik bir hammadde fark edildiğinde, Stok modülüne gidip ürün açmak
              ve geri dönmek gerekiyordu — yarım kalan reçete satırı da kayboluyordu. */}
          {q && onHizliUrunEkle && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const yeniId = onHizliUrunEkle(sorgu.trim());
                if (yeniId) sec({ id: yeniId });
              }}
              style={{
                display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left",
                padding: "9px 12px", border: "none", borderBottom: "1px solid #E4D8C0",
                background: "#F0F5EE", color: "#2F6B4F", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Plus size={14} />
              "{sorgu.trim()}" adıyla yeni hammadde ekle
            </button>
          )}
          {sonuclar.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--erp-text-3)" }}>
              {q ? `"${sorgu}" ile eşleşen ürün yok` : "Ürün yok"}
            </div>
          ) : (
            sonuclar.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); sec(u); }}
                onMouseEnter={() => setVurgulu(i)}
                // Kategori rengi sol kenarda: arama sonuçlarında mamul ile hammaddeyi karıştırmak
                // en kolay yer burası — liste karışık geliyor ve isimler benzeyebiliyor.
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  background: i === vurgulu ? "#FBF0E2" : "transparent",
                  border: "none", borderBottom: "1px solid #F2E8D8",
                  borderLeft: `4px solid ${CAT_COLORS[u.kategori] || "var(--erp-border)"}`,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                {/* ÜRÜN ADI ÖNCELİKLİ.
                    Önceden ad esnek, üç rozet (kategori + malzeme tipi + birim) sabit genişlikteydi.
                    Dar ekranda rozetler yerini koruyup adı eziyordu: "Mavi Rekapta" yalnızca "M",
                    "3454 Taban" ise "3..." olarak görünüyordu — yani listeden ürün SEÇİLEMİYORDU.
                    Kategori rozeti kaldırıldı; sol kenardaki renkli şerit ve ikon zaten aynı bilgiyi
                    veriyor. Malzeme tipi ve birim küçültülüp ada yer açıldı. */}
                <KategoriIkonu kategori={u.kategori} size={14} />
                <span style={{ flex: 1, minWidth: 90, fontSize: 14, fontWeight: 600, color: "var(--erp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.ad}{u.pasif ? " (pasif)" : ""}
                </span>
                {/* SEÇİLİ PROSESE AİT olanlar işaretlenir. Liste zaten onları üste alıyor ama
                    hiçbir görsel ayrım yoktu: kullanıcı sıranın neden değiştiğini anlamıyordu. */}
                {oncelikliProses && (u.varsayilanProses || "") === oncelikliProses && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: "var(--erp-r-pill)",
                      background: prosesRengi(oncelikliProses), color: "var(--erp-panel-2)",
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    {oncelikliProses}
                  </span>
                )}
                {/* EŞLEŞME SEBEBİ GÖRÜNÜR. "147" arayınca listede sadece ürün adı çıksaydı,
                    kullanıcı o satırın neden geldiğini bilemez ve doğru ürün olduğuna
                    güvenemezdi. Yalnızca ARAMAYLA EŞLEŞEN kod gösteriliyor; hepsini basmak
                    satırı doldurup ürün adını ezerdi. */}
                {q ? (eslesenOzelKodlar(u, ozelKodAlanlari, q).map((x) => (
                  <span
                    key={x.etiket}
                    className="mono"
                    style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A18", color: "var(--erp-info)", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {x.etiket}: {x.deger}
                  </span>
                ))) : null}
                {u.malzemeTipi && (
                  <span className="mono" style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-panel-2)", color: "var(--erp-text-2)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {u.malzemeTipi}
                  </span>
                )}
                <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", whiteSpace: "nowrap", flexShrink: 0 }}>{u.birim}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

