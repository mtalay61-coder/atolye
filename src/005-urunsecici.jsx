// Kategori ikonları. Ürün görseli yüklenmemişse listede boş bir kare kalıyordu; kategori ikonu
// hem o boşluğu dolduruyor hem de satırın ne olduğunu okumadan ayırt ettiriyor.
// İkonlar anlamla seçildi: hammadde = katman/tabaka, yarı mamul = makas (işlenmiş ama bitmemiş),
// mamul = paketlenmiş kutu, hizmet = el aleti.
// Aramalı ürün seçici. Açılır liste, stok büyüdükçe kullanılamaz hale geliyor: 200 kalem arasından
// "Çelikli Taban"ı bulmak için listede kaydırmak gerekiyor ve seçenekler yalnızca ada göre sıralı.
//
// Bu bileşen yazarak süzer; ada, koda ve malzeme tipine göre eşleşir. Klavyeyle kullanılabilir
// (yukarı/aşağı/Enter/Escape) çünkü reçete girişi seri bir iştir, fareye uzanmak yavaşlatır.
// `veriAdi` / `kucuk` / `temizle` (v1.631.0): sipariş formunun SATIRINDA da kullanılıyor (açılır liste yerine) — kutuya data
// özniteliği, satıra uygun küçük boy, satırda ürün boşaltılamadığı için × gizlenebilir.
function AramaliUrunSecici({ urunler, seciliId, onSec, placeholder, oncelikliProses, onHizliUrunEkle, ozelKodAlanlari, veriAdi, kucuk = false, temizle = true }) {
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
          padding: kucuk ? "3px 6px" : "6px 8px", borderRadius: "var(--erp-r-md)", border: `1px solid ${acik ? "var(--erp-brown)" : "var(--erp-border)"}`, background: "#fff",
        }}
      >
        <Search size={13} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
        <input
          {...(veriAdi ? { [veriAdi]: "1" } : {})}
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
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: kucuk ? 12 : 14, fontWeight: kucuk ? 600 : undefined, padding: 0 }}
        />
        {secili && !acik && temizle && (
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
            background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)",
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
                padding: "9px 12px", border: "none", borderBottom: "1px solid var(--erp-line-soft)",
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
                data-urun-oneri={u.ad}
                onMouseDown={(e) => { e.preventDefault(); sec(u); }}
                onMouseEnter={() => setVurgulu(i)}
                // Kategori rengi sol kenarda: arama sonuçlarında mamul ile hammaddeyi karıştırmak
                // en kolay yer burası — liste karışık geliyor ve isimler benzeyebiliyor.
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  background: i === vurgulu ? "var(--erp-hover)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--erp-head)",
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
                {/* ÜRÜN RESMİ (26 Eylül, v1.467.0 — kullanıcı: "siparişte ürün girerken resimde
                    göstersin"). Model adları birbirine benziyor (27322 D / 27325 D); resim, adı okumadan
                    doğru modeli seçtiriyor. Kapak resmi yoksa ilk renk resmi, o da yoksa kategori ikonu. */}
                {(() => {
                  const resim = u.kapakResmi || Object.values(u.renkResimleri || {}).find(Boolean) || "";
                  return resim ? (
                    <img src={resim} alt="" data-urun-secici-resim="1" loading="lazy"
                      style={{ width: 36, height: 36, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid var(--erp-line-soft)", flexShrink: 0, background: "#fff" }} />
                  ) : (
                    <span style={{ width: 36, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}><KategoriIkonu kategori={u.kategori} size={14} /></span>
                  );
                })()}
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


// ---- ARAMALI SEÇİCİ (genel) — 25 Eylül, v1.452.0 ----
// Kullanıcı: "Renk ekleme yazma ile seçici olsun, yazdıkça elensin liste." Açılır liste (select)
// 12+ renkte kaydırma istiyordu; tarayıcının datalist'i ise telefonda tutarsız (bazı cihazda liste
// hiç çıkmıyor, süzme görünmüyor). Bu bileşen kendi listesini çiziyor: yazdıkça süzer (Türkçe
// büyük/küçük harf duyarsız, kelimenin içinden de eşleşir), ok tuşları + Enter, dokunarak seçim.
//
// `temizle`: seçimden sonra kutu boşalır ve odakta kalır — art arda birden fazla öğe eklemek için
// (renk ekleme). Seçim `onSec(deger)` ile bildiriliyor; hangi değerin "seçili" durduğunu tutmak
// çağıranın işi değil, bu kip bir EKLEME kutusu.
function AramaliSecici({ secenekler, onSec, placeholder, temizle = true, veriAdi, genislik = 220 }) {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [vurgulu, setVurgulu] = useState(0);
  const inputRef = React.useRef(null);
  const q = sorgu.trim().toLocaleLowerCase("tr-TR");
  // Başı eşleşenler önce ("siy" → "Siyah Süet", sonra "Kırık Siyah"): aranan çoğunlukla odur.
  // `ek` (v1.471.0): seçeneğin yanında soluk açıklama ("Deri · ortak olur"); aramaya katılmaz.
  // `yalnizAramada`: kutu boşken listede yok, yazınca bulunur — varsayılan liste dar kalsın,
  // istisna (başka malzeme tipinin rengi) yine de seçilebilsin.
  const sonuclar = (() => {
    if (!q) return secenekler.filter((s) => !s.yalnizAramada);
    const bas = [], ic = [];
    secenekler.forEach((s) => {
      const e = String(s.etiket).toLocaleLowerCase("tr-TR");
      if (e.startsWith(q) || e.split(/\s+/).some((k) => k.startsWith(q))) bas.push(s);
      else if (e.includes(q)) ic.push(s);
    });
    return [...bas, ...ic];
  })();

  function sec(s) {
    onSec(s.deger);
    setVurgulu(0);
    if (temizle) {
      setSorgu("");
      // Odak kutuda kalıyor, liste açık: sıradaki öğe hemen yazılabilsin.
      if (inputRef.current) inputRef.current.focus();
    } else {
      setSorgu(s.etiket);
      setAcik(false);
    }
  }

  return (
    <div style={{ position: "relative", width: genislik, maxWidth: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, boxSizing: "border-box", padding: "7px 10px",
        borderRadius: "var(--erp-r-md)", border: `1px solid ${acik ? "var(--erp-accent)" : "var(--erp-line)"}`, background: "#fff",
      }}>
        <Search size={14} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          {...(veriAdi ? { [veriAdi]: "1" } : {})}
          value={sorgu}
          onChange={(e) => { setSorgu(e.target.value); setAcik(true); setVurgulu(0); }}
          onFocus={() => setAcik(true)}
          onBlur={() => setTimeout(() => setAcik(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAcik(true); setVurgulu((v) => Math.min(v + 1, sonuclar.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setVurgulu((v) => Math.max(v - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (sonuclar[vurgulu]) sec(sonuclar[vurgulu]); }
            else if (e.key === "Escape") { setAcik(false); setSorgu(""); }
          }}
          placeholder={placeholder || "Yazın ya da seçin…"}
          autoComplete="off" autoCorrect="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, padding: 0 }}
        />
      </div>
      {acik && (
        <div role="listbox" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 60, minWidth: "100%", maxHeight: 280, overflowY: "auto",
          background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", boxShadow: "0 10px 28px rgba(16, 24, 40, 0.12)", padding: 4,
        }}>
          {sonuclar.length === 0 ? (
            <div style={{ padding: "9px 10px", fontSize: 13, color: "var(--erp-text-3)" }}>"{sorgu}" ile eşleşen yok</div>
          ) : sonuclar.map((s, i) => (
            <button
              key={s.deger}
              type="button"
              role="option"
              aria-selected={i === vurgulu}
              data-aramali-secenek={s.deger}
              // mousedown: blur'dan ÖNCE seçilsin (click'te liste kapanmış olurdu).
              onMouseDown={(e) => { e.preventDefault(); sec(s); }}
              onMouseEnter={() => setVurgulu(i)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: "var(--erp-r-sm)",
                background: i === vurgulu ? "var(--erp-hover)" : "transparent", color: "var(--erp-text)", fontSize: 14, cursor: "pointer",
              }}
            >
              {s.etiket}
              {s.ek && <span data-aramali-ek="1" style={{ marginLeft: 8, fontSize: 11, color: "var(--erp-text-3)" }}>{s.ek}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- ARAMALI METİN (serbest değer + öneri) — 25 Eylül, v1.454.0 ----
// Kullanıcı (özel kod alanları Taban/Kalıp için): "Bu alanlarda aynı şekilde olsun." Renkten farkı:
// değer SERBEST — yeni bir taban numarası yazılabilmeli. Kutu değeri tutuyor (`deger`/`onDegis`);
// yazdıkça altında daha önce girilmiş değerler (`oneriler`) süzülüyor, dokununca kutuya yazılıyor.
// Aynı değerin farklı yazımları (147 / 147A) bu sayede azalıyor — süzgeç ve arama da temizleşiyor.
//
// `yalnizListeden` (v1.457.0, sezon için): değer listedekilerden biri olmak ZORUNDA — sezon özel kod
// kapsamının ekseni, "ilkbahar" gibi serbest bir yazım hiçbir kapsamla eşleşmez. Kutudan çıkınca
// yazılan listede yoksa ilk eşleşen öneriye oturtulur, eşleşen de yoksa temizlenir.
// `sayisal` (yıl için): yalnız rakam kabul edilir, telefonda sayı klavyesi açılır.
// `resimler` (v1.469.0, sipariş renk seçimi): { öneri: resimAdresi } — varsa listede her önerinin
// yanında ve seçili değer kutudayken kutunun solunda küçük resim. Renk adları benzeşiyor (Taba Süet /
// Taba Deri); resim, okumadan doğru rengi seçtiriyor.
function AramaliMetin({ deger, onDegis, oneriler, placeholder, veriAdi, stil, yalnizListeden = false, sayisal = false, resimler = null, disabled = false }) {
  const [acik, setAcik] = useState(false);
  const [vurgulu, setVurgulu] = useState(-1);
  // YAZILDI MI (v1.540.0): odaklanınca false, kutuya harf girince true. Tam eşleşmede "hepsini göster"
  // yalnız YAZILMADAN açılışta geçerli (seçili rengi değiştirmek için); yazarken tam adı bitirmek
  // listeyi süzmeyi bırakmamalı. Kullanıcı: "Kahve aramada tam adını yazınca tüm renkleri listeliyor."
  const [yazildi, setYazildi] = useState(false);
  const q = String(deger || "").trim().toLocaleLowerCase("tr-TR");
  const tekil = Array.from(new Set((oneriler || []).map((o) => String(o).trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  // Başı eşleşenler önce. Kutudaki değer bir önerinin TAM kendisiyse ve kutu YAZILMADAN açıldıysa
  // (seçim yapılmış) liste süzülmüyor, diğerleri gösteriliyor: seçimi değiştirmek için önce kutuyu
  // silmek gerekmesin (açılır liste gibi). Yazarken tam eşleşen en üstte, sonra "Kahve Baskı" gibi
  // o adla başlayanlar — v1.540.0'a kadar burada da tüm liste açılıyordu.
  const tamEslesme = tekil.some((o) => o.toLocaleLowerCase("tr-TR") === q);
  const sonuclar = (() => {
    if (!q) return tekil;
    if (tamEslesme && !yazildi) return tekil.filter((o) => o.toLocaleLowerCase("tr-TR") !== q);
    const tam = [], bas = [], ic = [];
    tekil.forEach((o) => {
      const e = o.toLocaleLowerCase("tr-TR");
      if (e === q) tam.push(o); else if (e.startsWith(q)) bas.push(o); else if (e.includes(q)) ic.push(o);
    });
    return [...tam, ...bas, ...ic];
  })().slice(0, 50);
  const sec = (o) => { onDegis(o); setAcik(false); setVurgulu(-1); setYazildi(false); };
  const kutuResmi = resimler && tamEslesme ? resimler[tekil.find((o) => o.toLocaleLowerCase("tr-TR") === q)] : null;
  return (
    <div style={{ position: "relative" }}>
      {kutuResmi && (
        <img src={kutuResmi} alt="" data-aramali-kutu-resim="1"
          style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, objectFit: "cover", borderRadius: 4, pointerEvents: "none" }} />
      )}
      <input
        {...(veriAdi ? { [veriAdi]: "1" } : {})}
        disabled={disabled}
        value={deger || ""}
        onChange={(e) => { onDegis(sayisal ? e.target.value.replace(/\D/g, "") : e.target.value); setAcik(true); setVurgulu(-1); setYazildi(true); }}
        onFocus={() => { setAcik(true); setYazildi(false); }}
        onBlur={() => {
          setTimeout(() => setAcik(false), 150);
          if (yalnizListeden && q && !tamEslesme) onDegis(sonuclar[0] || "");
          else if (yalnizListeden && tamEslesme) onDegis(tekil.find((o) => o.toLocaleLowerCase("tr-TR") === q));
        }}
        {...(sayisal ? { inputMode: "numeric" } : {})}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAcik(true); setVurgulu((v) => Math.min(v + 1, sonuclar.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setVurgulu((v) => Math.max(v - 1, -1)); }
          // Enter yalnız bir öneri VURGULUYSA onu seçer; yoksa yazılan değer olduğu gibi kalır.
          else if (e.key === "Enter" && vurgulu >= 0 && sonuclar[vurgulu]) { e.preventDefault(); sec(sonuclar[vurgulu]); }
          else if (e.key === "Escape") setAcik(false);
        }}
        placeholder={placeholder}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        style={{ ...inputStyle, width: "100%", ...(stil || {}), ...(kutuResmi ? { paddingLeft: 38 } : {}) }}
      />
      {acik && sonuclar.length > 0 && (
        <div role="listbox" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 60, minWidth: "100%", maxHeight: 240, overflowY: "auto",
          background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", boxShadow: "0 10px 28px rgba(16, 24, 40, 0.12)", padding: 4,
        }}>
          {sonuclar.map((o, i) => (
            <button key={o} type="button" role="option" aria-selected={i === vurgulu} data-aramali-oneri={o}
              onMouseDown={(e) => { e.preventDefault(); sec(o); }}
              onMouseEnter={() => setVurgulu(i)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: resimler ? "5px 8px" : "7px 10px", border: "none", borderRadius: "var(--erp-r-sm)",
                background: i === vurgulu ? "var(--erp-hover)" : "transparent", color: "var(--erp-text)", fontSize: 13, cursor: "pointer" }}>
              {resimler && (resimler[o]
                ? <img src={resimler[o]} alt="" data-aramali-oneri-resim="1" loading="lazy" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4, border: "1px solid var(--erp-line-soft)", flexShrink: 0 }} />
                : <span style={{ width: 34, height: 34, borderRadius: 4, background: "var(--erp-zebra)", flexShrink: 0 }} />)}
              <span>{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- SATIR RENK KUTUSU (v1.631.0) ----
// Kullanıcı (sipariş düzenleme, satırdaki renk açılır listesi): "Renk değiştirirken hep kullandığımız şekilde olsun." Satırdaki
// <select> yerine Kalem Ekle'deki aramalı + resimli kutunun (AramaliMetin, yalnızListeden) aynısı. Seçim yalnız listedeki
// bir renge TAM eşleşince `onSec`e gider; yarım yazım ya da boşaltılıp çıkılan kutu kayıtlı renge geri döner (satır
// yanlışlıkla renksiz kalmasın). Kayıtlı renk üründe artık yoksa kutuda yazmaya devam eder (eski "(listede yok)" seçeneği).
function SatirRenkKutusu({ deger, secenekler, resimler, onSec, veriAdi = "data-form-kalem-renk", eksik = false, placeholder = "Renk ara…" }) {
  const [yazi, setYazi] = useState(deger || "");
  useEffect(() => { setYazi(deger || ""); }, [deger]);
  return (
    // `data-renk-secenekleri`: testler seçenekleri okusun ("X (listede yok)" — kayıtlı renk üründe artık yoksa, eski select gibi).
    <div style={{ minWidth: 170 }}
      data-renk-secenekleri={[...(deger && !(secenekler || []).includes(deger) ? [`${deger} (listede yok)`] : []), ...(secenekler || [])].join("|")}
      onBlur={() => setTimeout(() => setYazi((y) => ((secenekler || []).includes(y) ? y : (deger || ""))), 160)}>
      <AramaliMetin
        veriAdi={veriAdi}
        deger={yazi}
        onDegis={(v) => { setYazi(v); if ((secenekler || []).includes(v) && v !== deger) onSec(v); }}
        oneriler={secenekler}
        resimler={resimler}
        yalnizListeden
        placeholder={placeholder}
        stil={{ padding: "4px 8px", fontSize: 13, ...(eksik ? { borderColor: "var(--erp-danger, #B3261E)" } : {}) }}
      />
    </div>
  );
}

// ---- CARİ SEÇİCİ (aramalı) — v1.620.0 ----
// Kullanıcı (sipariş formu, açılır müşteri listesi): "Müşteri seçerken filtreli olsun, daha öncekiler gibi; cari arttıkça
// içinden çıkılmıyor." Açılır <select> yerine yazdıkça süzülen kutu (renk/ürün seçicileriyle aynı davranış): ünvan,
// cari kodu ve telefonla aranır (Türkçe büyük/küçük harf duyarsız, başı eşleşen önce); ok tuşları + Enter; dokunarak seçim.
// DEĞER `deger` (cari id) — kutu odakta değilken seçili carinin ünvanı yazar; dışarıdan değişen seçim (form sıfırlama,
// tedarikçi otomatik doldurma) kutuya yansır. Kutu boşaltılıp çıkılırsa seçim KALIR (yanlışlıkla silinmesin); "×" temizler.
// `veriAdi` kutuya, `data-cari-id` seçili id'ye konur (testler okuyor).
// `title` kutuya gider; `minGenislik` dar formlarda (kasa/çek satırı) kutunun ezilmemesi için; `kucuk` 12 px
// yazı — kasa formunun diğer alanlarıyla aynı boy (v1.622.0).
function CariSecici({ cariler, deger, onDegis, disabled = false, placeholder = "Cari ara: ünvan, kod, telefon…", veriAdi, title, minGenislik, kucuk = false }) {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState(null);   // null = yazılmıyor, kutuda seçili ünvan
  const [vurgulu, setVurgulu] = useState(0);
  const secili = (cariler || []).find((c) => c.id === deger) || null;
  const q = String(sorgu || "").trim().toLocaleLowerCase("tr-TR");
  const sonuclar = (() => {
    const liste = cariler || [];
    if (!q) return liste;
    const bas = [], ic = [];
    liste.forEach((c) => {
      const ad = String(c.unvan || "").toLocaleLowerCase("tr-TR");
      // Kod hem "7" hem listede görünen "0007" biçimiyle bulunur.
      const kodlar = c.kod != null && c.kod !== "" ? [String(c.kod), String(c.kod).padStart(4, "0")] : [];
      const diger = [...kodlar, c.telefon, c.whatsapp].filter(Boolean).map((x) => String(x).toLocaleLowerCase("tr-TR"));
      if (ad.startsWith(q) || ad.split(/\s+/).some((k) => k.startsWith(q)) || diger.some((d) => d.startsWith(q))) bas.push(c);
      else if (ad.includes(q) || diger.some((d) => d.includes(q))) ic.push(c);
    });
    return [...bas, ...ic];
  })().slice(0, 80);
  const sec = (c) => { onDegis(c.id); setSorgu(null); setAcik(false); setVurgulu(0); };
  return (
    <div style={{ position: "relative", minWidth: minGenislik || undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, ...inputStyle, padding: "0 8px", opacity: disabled ? 0.6 : 1,
        border: `1px solid ${acik ? "var(--erp-accent)" : "var(--erp-line)"}` }}>
        <Search size={14} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
        <input
          {...(veriAdi ? { [veriAdi]: "1" } : {})}
          data-cari-id={deger || ""}
          title={title}
          disabled={disabled}
          value={sorgu != null ? sorgu : (secili ? secili.unvan : "")}
          onChange={(e) => { setSorgu(e.target.value); setAcik(true); setVurgulu(0); }}
          onFocus={(e) => { setSorgu(""); setAcik(true); setVurgulu(0); }}
          onBlur={() => setTimeout(() => { setAcik(false); setSorgu(null); }, 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAcik(true); setVurgulu((v) => Math.min(v + 1, sonuclar.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setVurgulu((v) => Math.max(v - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (sonuclar[vurgulu]) sec(sonuclar[vurgulu]); }
            else if (e.key === "Escape") { setAcik(false); setSorgu(null); e.currentTarget.blur(); }
          }}
          placeholder={secili ? secili.unvan : placeholder}
          autoComplete="off" autoCorrect="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: kucuk ? 12 : 14, padding: kucuk ? "5px 0" : "8px 0", fontWeight: secili && sorgu == null ? 700 : 400 }}
        />
        {secili && !disabled && (
          <button type="button" title="Seçimi temizle" data-cari-secici-temizle="1" onMouseDown={(e) => { e.preventDefault(); onDegis(""); setSorgu(null); }}
            style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", padding: 0, display: "flex" }}><X size={14} /></button>
        )}
      </div>
      {acik && !disabled && (
        <div role="listbox" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 60, minWidth: "100%", maxHeight: 300, overflowY: "auto",
          background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", boxShadow: "0 10px 28px rgba(16, 24, 40, 0.12)", padding: 4 }}>
          {sonuclar.length === 0 ? (
            <div style={{ padding: "9px 10px", fontSize: 13, color: "var(--erp-text-3)" }}>"{sorgu}" ile eşleşen cari yok</div>
          ) : sonuclar.map((c, i) => (
            <button key={c.id} type="button" role="option" aria-selected={c.id === deger} data-cari-secenek={c.unvan}
              onMouseDown={(e) => { e.preventDefault(); sec(c); }}
              onMouseEnter={() => setVurgulu(i)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: "var(--erp-r-sm)",
                background: i === vurgulu ? "var(--erp-hover)" : "transparent", color: "var(--erp-text)", fontSize: 14, cursor: "pointer", fontWeight: c.id === deger ? 800 : 400 }}>
              {c.kod != null && c.kod !== "" && <span className="mono" style={{ fontSize: 11, color: "var(--erp-info)", minWidth: 34 }}>{String(c.kod).padStart(4, "0")}</span>}
              <span style={{ flex: 1 }}>{c.unvan}</span>
              {c.ulke && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{c.ulke}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
