// ================= GELİR / GİDER KARTLARI =================
//
// 20 Eylül: Tanımlar'dan çıkarılıp kendi ekranına alındı (Finans › Gelir / Gider).
//
// NEDEN: Tanımlar bir KURULUM ekranı — renk, beden, proses gibi bir kez doldurulup unutulan
// şeyler. Gelir/gider kartları ise her gün kullanılan bir defter: yeni gider çıkar, kart eklenir,
// rapor oradan okunur. İkisini aynı sayfada tutmak, günlük işi kurulum ayarlarının arasına
// gömmekti.
// KART HAREKETİ SİLME (v1.688.0 — kullanıcı: "gelir gider silindiğinde buradan silinmiyor, kart olarak silinebilir sadece;
// kontrolleri koyalım, cari gibi hareket etsin"). Gelir/Gider kart ekstresi (396) ve Ödeme & Tahsilat son listesi (260) bunu çağırır. Hareket kartın ekstresinden silinir; kurallar Kasa & Banka'daki
// silmeyle aynı (205 `hareketSil`): dönem kilidi, silme yetkisi yoksa yönetici onayına ("muhasebeHareketSil" — onaylanınca
// 205 aynı işi yapar), çöpe kayıt. Kart hareketi cariye ve çeke bağlı olmadığı için yalnız hesabın listesinden düşer.
async function kartHareketiSilIslem(h, { muhasebe, onMuhasebeKaydet, kullaniciYetkisiVar, onayIste, onCopaAt, showToast, onFisIptal }) {
  if (!onMuhasebeKaydet) return;
  if (donemKilidiEngel(h.tarih, showToast, "Silme")) return;
  const tur = h.hesapTur;
  const hesap = ((muhasebe && muhasebe[tur === "kasa" ? "kasalar" : "bankalar"]) || []).find((x) => x.id === h.hesapId);
  if (!hesap) return;
  const ozet = `${h.yon || ""} ${h.tutar || 0} ${PARA_SEMBOLU[hesap.paraBirimi || "TRY"] || ""}${h.aciklama ? " — " + h.aciklama : ""}`;
  if (kullaniciYetkisiVar && !kullaniciYetkisiVar("muhasebe", "silme")) {
    if (onayIste) onayIste("muhasebe", "Sil", `"${hesap.ad}" hesabından ${ozet} kaydını sil`, "muhasebeHareketSil", { tur, hesapId: hesap.id, hareketId: h.id });
    else showToast("Silme yetkiniz yok");
    return;
  }
  // KİMLİKSİZ ESKİ KAYIT: kimlik yoksa `id !== undefined` süzgeci hesabın kimliksiz BÜTÜN hareketlerini silerdi; o kayıt
  // içerik (tarih + tutar + kart + açıklama) ile ve YALNIZ ilki bulunur.
  const ayni = (x) => (h.id ? x.id === h.id
    : !x.id && x.tarih === h.tarih && x.tutar === h.tutar && x.giderKartId === h.giderKartId && (x.aciklama || "") === (h.aciklama || ""));
  const asil = (hesap.hareketler || []).find(ayni);
  if (!asil) { showToast("Kayıt bulunamadı — sayfayı yenileyip tekrar deneyin"); return; }
  // TEK FİŞ DEFTERİ (v1.737.0): sunucu fişinin satırı silinmez — fiş İPTAL edilir (100 sunucuFisiniIptalEt; iz kalır).
  if (onFisIptal && asil.fisNo) {
    const iptal = onFisIptal(asil.fisNo, "Gelir/gider hareketi silindi");
    if (iptal) { await iptal; return; }
  }
  if (onCopaAt) onCopaAt(tur === "kasa" ? "kasaHareketi" : "bankaHareketi", hesap.ad, asil,
    { ozet: `${ozet}${h.tarih ? " · " + h.tarih : ""}`, ustKayit: { tur, id: hesap.id, ad: hesap.ad }, yanEtkiliMi: false, geriAlinabilirMi: false });
  const anahtar = tur === "kasa" ? "kasalar" : "bankalar";
  await onMuhasebeKaydet({ ...muhasebe, [anahtar]: (muhasebe[anahtar] || []).map((x) => (x.id === hesap.id ? { ...x, hareketler: (x.hareketler || []).filter((y) => y !== asil) } : x)) });
  showToast("Hareket silindi");
}

// KISIT (v1.689): onay sistemi kapalıyken muhasebe silme yetkisi olmayan kullanıcı kart hareketi
// silme düğmesini hiç görmez (önceden "yönetici onayına gider" yoluna düşüyordu).
function kartSilGizliMi(kullaniciYetkisiVar, onayAcik) {
  return !!kullaniciYetkisiVar && !kullaniciYetkisiVar("muhasebe", "silme") && !onayAcik;
}
function GelirGiderEkrani({ onFisIptal, tanimlar, onSave, muhasebe, stok, cariler, uretim, showToast, onMuhasebeKaydet, kullaniciYetkisiVar, onayIste, onCopaAt }) {
  const kartHareketiSil = (h) => kartHareketiSilIslem(h, { muhasebe, onMuhasebeKaydet, kullaniciYetkisiVar, onayIste, onCopaAt, showToast, onFisIptal });
  // Hangi bölüm açık (20 Eylül).
  const [bolum, setBolum] = useState("kartlar");
  // Yeni grup formu (20 Eylül).
  const [yeniGrupAdi, setYeniGrupAdi] = useState("");
  const [yeniGrupKod, setYeniGrupKod] = useState("");
  const [yeniGrupTur, setYeniGrupTur] = useState("gider");
  // Gruplar kullanıcı tanımlı (20 Eylül); yoksa başlangıç listesi.
  const gruplar = giderGelirGruplari(tanimlar);
  const [yeniGrup, setYeniGrup] = useState({ ad: "", tdhp: "" });
  // Yeni kart formu (Tanımlar'dan taşındı).
  const [yeniGiderKart, setYeniGiderKart] = useState({ ad: "", grup: "yonetim", tdhp: "" });
  // Ekstresi açık olan kart (20 Eylül).
  const [acikKart, setAcikKart] = useState(null);
  // GRUP BAŞLIKLARI AÇILIR/KAPANIR (v1.688.3 — kullanıcı: "başlıklar tıklayınca açılsın; liste büyüdükçe ekran büyür,
  // toparlansın"). Kapalı başlar; açılanlar bu cihazda hatırlanır (Tanımlar başlıklarıyla aynı, v1.588.0).
  const [acikGruplar, setAcikGruplar] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("gelirgider:acikGruplar") || "[]")); } catch (e) { return new Set(); }
  });
  const grupAcKapa = (key) => setAcikGruplar((o) => {
    const y = new Set(o); if (y.has(key)) y.delete(key); else y.add(key);
    try { localStorage.setItem("gelirgider:acikGruplar", JSON.stringify([...y])); } catch (e) { /* depo yoksa yalnız bu oturum */ }
    return y;
  });

  // KART HAREKETLERİ: bütün kasa ve banka hareketlerinden o karta yazılmış olanlar. Ayrı bir
  // defter tutulmuyor — hareketin kendisi zaten `giderKartId` taşıyor; ikinci bir kayıt, iki
  // yerde iki gerçek demek olurdu.
  const kartHareketleri = (kartId) => {
    const liste = [];
    [...((muhasebe && muhasebe.kasalar) || []).map((hes) => [hes, "kasa"]), ...((muhasebe && muhasebe.bankalar) || []).map((hes) => [hes, "banka"])].forEach(([hes, hesapTur]) => {
      (hes.hareketler || []).forEach((h) => {
        if (h.giderKartId === kartId) liste.push({ ...h, hesapAd: hes.ad, paraBirimi: hes.paraBirimi || "TRY", hesapTur, hesapId: hes.id });
      });
    });
    // BÖLÜM İŞÇİLİĞİ (v1.587.0): bölüme bağlı kartın hareketi personele tahakkuk eden MAAŞ (cari hareketi) —
    // "Kesimhane işçiliği" gideri ödendiği gün değil hak edildiği ay doğar. Kasadan cariye ödeme kartı tekrar yazmaz.
    bolumMaasHareketleri(tanimlar, cariler, kartId).forEach((h) => liste.push({ ...h, yon: "Çıkış", hesapAd: `Maaş tahakkuku · ${h.cariUnvan}` }));
    // ÜRETİM KARŞILIKLARI (v1.692, 246): prosese bağlı işçilik fişleri ve üretim hammadde çıkışları.
    kartUretimHareketleri(tanimlar, cariler, stok, (muhasebe && muhasebe.kurlar) || {}, kartId).forEach((h) => liste.push(h));
    return liste.sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
  };
  // HESABIN PARA BİRİMİYLE TL'YE (v1.639.0, denetim): USD kasasından 100 $ çıkış "100 ₺" sayılıyordu; Kâr-Zarar (247)
  // aynı hareketi kurla çeviriyor — aynı kart iki ekranda farklı çıkıyordu. Aynı çevirici (`kzTL`), kurlar Tanımlar'dan.
  // YÖN KARTIN TÜRÜNE GÖRE (v1.695.1, kullanıcı: "neden başında - var, karışıklık var gibi"): toplam kartın kendi
  // yönünde artı. Gider kartında çıkış (+), giriş (iade) eksi; GELİR kartında giriş (+), çıkış eksi. Önceden her kart
  // gider gibi sayılıyor, satış gelirleri "-1.000 ₺" görünüyordu.
  const kartToplami = (kartId) => {
    const gelirMi = (((tanimlar.giderKartlari || []).find((k) => k.id === kartId)) || {}).tur === "gelir";
    return kartHareketleri(kartId)
      .reduce((t, h) => t + (h.yon === "Giriş" ? -1 : 1) * (gelirMi ? -1 : 1) * kzTL(h.tutar || 0, h.paraBirimi, (muhasebe && muhasebe.kurlar) || {}), 0);
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
    {/* İKİ BÖLÜM (20 Eylül): kartlar GERÇEKLEŞEN ödemeyi izler, genel gider defteri PLANLANAN
        aylık yükü tutar ve çift başı maliyeti hesaplar. Aynı ekranda ama ayrı sekmelerde:
        biri "ne ödedik", diğeri "bir çift bana kaça mal oluyor". */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {/* KÂR / ZARAR BURADA (v1.587.0): Kasa & Banka'dan taşındı — "kazanıyor muyuz" sorusu kartların yanında. */}
      {[{ k: "kartlar", ad: "Gelir / Gider Kartları" }, { k: "genel", ad: "Genel Gider ve Çift Başı Maliyet" }, { k: "karzarar", ad: "Kâr / Zarar" }].map((x) => (
        <button key={x.k} type="button" data-gg-sekme={x.k} onClick={() => setBolum(x.k)}
          style={{ padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: `1.5px solid ${bolum === x.k ? "var(--erp-primary)" : "var(--erp-border)"}`,
            background: bolum === x.k ? "var(--erp-primary)" : "#fff", color: bolum === x.k ? "#fff" : "var(--erp-text-2)" }}>
          {x.ad}
        </button>
      ))}
    </div>

    {bolum === "karzarar" ? (
      <KarZararPaneli stok={stok} cariler={cariler} muhasebe={muhasebe} giderKartlari={tanimlar.giderKartlari || []} tanimlar={tanimlar} uretim={uretim} />
    ) : bolum === "genel" ? (
      <GenelGiderEkrani tanimlar={tanimlar} onSave={onSave} stok={stok} muhasebe={muhasebe} showToast={showToast} />
    ) : (
    <>
    <UretimGiderBaglari tanimlar={tanimlar} onSave={onSave} cariler={cariler} stok={stok} kurlar={(muhasebe && muhasebe.kurlar) || {}} />
    {/* GELİR / GİDER KARTLARI (17 Eylül) — para hareketinin cari dışındaki karşı tarafı. */}
    <div style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, background: "#fff" }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Gelir / Gider Kartları</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
        Kira, elektrik, personel, nakliye gibi <b>alışı olmayan</b> giderlerin yazıldığı kartlar.
        Kasa/banka hareketinde karşı taraf olarak seçiliyor: böylece her çıkışın bir karşılığı olur
        ve kâr-zarar hesaplanabilir. Grup, kârlılık raporunda kullanılıyor.
      </p>
      {(() => {
        const kartlar = tanimlar.giderKartlari || [];
        const kaydet = (yeni) => onSave({ ...tanimlar, giderKartlari: yeni });
        return (
          <div style={{ display: "grid", gap: 8 }}>
            {/* GRUP YÖNETİMİ (kullanıcı, 20 Eylül: "grup için yeni grup ekleme veya düzeltme
                olsun"). Altyapı vardı (`giderGelirGruplari` özel listeyi okuyor) ama arayüz yoktu;
                gruplar koda gömülüydü. Artık her atölye kendi başlıklarını kurabiliyor —
                "Fason işçilik", "İhracat giderleri" gibi.
                
                KARTI OLAN GRUP SİLİNMİYOR: altındaki kartlar sahipsiz kalır ve hiçbir ekranda
                görünmezdi. Ad DEĞİŞTİRİLEBİLİR — anahtar sabit kaldığı için kartlar bağlı kalıyor. */}
            <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>
                Gruplar <span style={{ fontWeight: 400, fontSize: 11 }}>— kartların ana başlıkları; kâr-zarar dökümü de bunlara göre</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {gruplar.map((g) => (
                  <span key={g.key} style={{ display: "inline-flex", alignItems: "center", gap: 4,
                    background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-pill)", padding: "2px 4px 2px 10px" }}>
                    <input value={g.ad} data-gider-grup-ad={g.key}
                      onChange={(e) => onSave({
                        ...tanimlar,
                        giderGruplari: gruplar.map((x) => (x.key === g.key ? { ...x, ad: e.target.value } : x)),
                      })}
                      style={{ border: "none", background: "none", fontSize: 12, fontWeight: 700, color: "var(--erp-text)",
                        width: Math.max(80, (g.ad || "").length * 8) }} />
                    {g.tdhp ? <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{g.tdhp}</span> : null}
                    {!kartlar.some((k) => k.grup === g.key) && (
                      <button type="button" title="Grubu sil" data-gider-grup-sil={g.key}
                        onClick={() => onSave({ ...tanimlar, giderGruplari: gruplar.filter((x) => x.key !== g.key) })}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-danger)", fontSize: 13, padding: "0 4px" }}>×</button>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <input value={yeniGrupAdi} data-gider-yeni-grup="1" placeholder="Yeni grup: Fason işçilik…"
                  onChange={(e) => setYeniGrupAdi(e.target.value)}
                  style={{ width: 220, padding: "5px 8px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontSize: 13 }} />
                <input value={yeniGrupKod} data-gider-yeni-kod="1" placeholder="TDHP (ops.)"
                  onChange={(e) => setYeniGrupKod(e.target.value)}
                  style={{ width: 110, padding: "5px 8px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontSize: 13 }} />
                {/* TÜR SEÇİMİ (kullanıcı, 20 Eylül): yeni grup hep "gider" olarak açılıyordu;
                    gelir başlığı ("İhracat primi", "Hurda satışı") kurulamıyordu. Kâr-zarar
                    raporu türe göre ayırıyor: gider brüt kârdan düşer, gelir eklenir. */}
                <select value={yeniGrupTur} data-gider-yeni-tur="1"
                  onChange={(e) => setYeniGrupTur(e.target.value)}
                  style={{ width: 110, padding: "5px 8px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontSize: 13 }}>
                  <option value="gider">Gider</option>
                  <option value="gelir">Gelir</option>
                </select>
                <button type="button" className="btn-ghost" data-gider-grup-ekle="1" style={{ fontSize: 12, padding: "5px 12px" }}
                  onClick={() => {
                    const ad = String(yeniGrupAdi || "").trim();
                    if (!ad) return showToast("Grup adı gerekli");
                    onSave({
                      ...tanimlar,
                      giderGruplari: [...gruplar, { key: `gg${Date.now().toString(36)}`, ad, tur: yeniGrupTur, tdhp: String(yeniGrupKod || "").trim() }],
                    });
                    setYeniGrupAdi(""); setYeniGrupKod(""); setYeniGrupTur("gider");
                    showToast(`"${ad}" grubu eklendi`);
                  }}>
                  <Plus size={12} /> Grup ekle
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Field label="Kart adı">
                <input value={yeniGiderKart.ad} data-gider-ad="1" placeholder="örn. İşyeri kirası"
                  onChange={(e) => setYeniGiderKart({ ...yeniGiderKart, ad: e.target.value })}
                  style={{ ...inputStyle, width: 200 }} />
              </Field>
              <Field label="Grup">
                <select value={yeniGiderKart.grup} data-gider-grup="1"
                  onChange={(e) => setYeniGiderKart({ ...yeniGiderKart, grup: e.target.value })}
                  style={{ ...inputStyle, width: 170 }}>
                  {gruplar.map((g) => <option key={g.key} value={g.key}>{g.ad}</option>)}
                </select>
              </Field>
              <Field label="TDHP kodu (ops.)">
                <input value={yeniGiderKart.tdhp} data-gider-tdhp="1" placeholder="770.03"
                  onChange={(e) => setYeniGiderKart({ ...yeniGiderKart, tdhp: e.target.value })}
                  style={{ ...inputStyle, width: 110 }} />
              </Field>
              <button className="btn-primary" data-gider-ekle="1" style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => {
                  const ad = yeniGiderKart.ad.trim();
                  if (!ad) return showToast("Kart adı gerekli");
                  if (kartlar.some((k) => k.ad.toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"))) {
                    return showToast(`"${ad}" kartı zaten var`);
                  }
                  const grup = gruplar.find((g) => g.key === yeniGiderKart.grup) || gruplar[2];
                  kaydet([...kartlar, { id: uid("gkart"), ad, grup: grup.key, tur: grup.tur, tdhp: yeniGiderKart.tdhp.trim() || grup.tdhp }]);
                  setYeniGiderKart({ ad: "", grup: yeniGiderKart.grup, tdhp: "" });
                }}>
                <Plus size={13} /> Ekle
              </button>
              {/* Otomatik açılan işçilik/hammadde/bölüm kartları (v1.693) sayılmaz: yalnız onlar varken de hazır set sunulur. */}
              {kartlar.filter((k) => !otomatikGiderKartiMi(tanimlar, k)).length === 0 && (
                <button type="button" className="btn-ghost" data-gider-hazir="1" style={{ padding: "6px 12px", fontSize: 12 }}
                  title="Atölyede en sık kullanılan kalemlerle başla; sonra ekler/silersiniz"
                  onClick={() => {
                    kaydet([...kartlar, ...HAZIR_GIDER_KARTLARI.filter((k) => !kartlar.some((x) => kodEsit(x.ad, k.ad))).map((k) => {
                      const g = gruplar.find((x) => x.key === k.grup);
                      return { id: uid("gkart"), ad: k.ad, grup: k.grup, tur: g.tur, tdhp: g.tdhp };
                    })]);
                    showToast(`${HAZIR_GIDER_KARTLARI.length} hazır kart eklendi`);
                  }}>
                  Hazır kartlarla başla
                </button>
              )}
            </div>

            {kartlar.length === 0 ? (
              <EmptyState text="Henüz kart yok. Kira, elektrik, personel gibi kalemleri ekleyin." />
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {gruplar.map((g) => {
                  const grubun = kartlar.filter((k) => k.grup === g.key);
                  if (grubun.length === 0) return null;
                  const grupAcik = acikGruplar.has(g.key);
                  const grupToplam = grubun.reduce((t, k) => t + kartToplami(k.id), 0);
                  return (
                    <div key={g.key}>
                      <button type="button" data-gg-grup={g.key} data-acik={grupAcik ? "1" : "0"} onClick={() => grupAcKapa(g.key)}
                        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", cursor: "pointer",
                          background: grupAcik ? "transparent" : "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)",
                          padding: "7px 10px", margin: "6px 0 3px", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
                        {grupAcik ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        {g.ad} <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 400 }}>{g.tdhp}</span>
                        <span style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 400 }}>· {grubun.length} kart</span>
                        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: grupToplam ? "var(--erp-warn)" : "var(--erp-text-3)" }}>
                          {grupToplam.toLocaleString("tr-TR")} ₺
                        </span>
                      </button>
                      {grupAcik && grubun.map((k) => (
                        <div key={k.id} data-gider-kart={k.ad} style={{ display: "flex", alignItems: "center", gap: 8,
                          background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "5px 10px", marginBottom: 3 }}>
                          <b style={{ fontSize: 13 }}>{k.ad}</b>
                          {k.tdhp && <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{k.tdhp}</span>}
                          {k.bolumId && (
                            <span data-gider-kart-bolum={k.bolumId} title="Atölye içi bölüm kartı: bölüm personelinin maaş tahakkukları buraya işlenir"
                              style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-orange-bg)", color: "var(--erp-warn)" }}>
                              bölüm · maaş tahakkuku
                            </span>
                          )}
                          {/* KART EKSTRESİ (kullanıcı, 20 Eylül: "gider kartlarını da cari gibi
                              görmesi lazım... giderlerin raporları vs. olacak"). Kart artık yalnız
                              bir etiket değil: kendi hareketleri ve toplamı var — tıpkı cari gibi.
                              Tutar, o karta yazılmış bütün kasa/banka hareketlerinin toplamı. */}
                          <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700,
                            color: k.tur === "gelir" ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                            {kartToplami(k.id).toLocaleString("tr-TR")} ₺
                          </span>
                          <button type="button" className="btn-ghost" data-kart-ekstre={k.ad}
                            style={{ padding: "2px 8px", fontSize: 11 }}
                            onClick={() => setAcikKart(acikKart === k.id ? null : k.id)}>
                            {acikKart === k.id ? "Kapat" : "Hareketler"}
                          </button>
                          {/* HAREKETİ OLAN KART SİLİNMEZ (v1.688.0 — cari gibi): kart silinince hareketleri kasada kartsız kalıyor,
                              Gelir/Gider ve Kâr/Zarar'da hiçbir karta yazılmamış para oluyordu. Önce hareketler silinir. */}
                          {kartHareketleri(k.id).length > 0 ? (
                            <span className="btn-ikon" data-gider-kart-silinemez={k.ad} title={`Kart silinemez — ${kartHareketleri(k.id).length} hareket kayıtlı. Önce hareketleri silin.`}
                              style={{ opacity: 0.35, cursor: "not-allowed" }}><Trash2 size={14} /></span>
                          ) : (
                            <span>
                              <SilOnayButonu onConfirm={() => kaydet(kartlar.filter((x) => x.id !== k.id))} boyut={11} />
                            </span>
                          )}
                        </div>
                      )).concat([])}
                      {grupAcik && grubun.filter((k) => acikKart === k.id).map((k) => (
                        <div key={`ekstre-${k.id}`} data-kart-hareketleri={k.ad}
                          style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginBottom: 6 }}>
                          {kartHareketleri(k.id).length === 0 ? (
                            <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                              Bu karta henüz hareket yazılmamış. Kasa/banka işleminde karşı taraf olarak seçince burada görünür.
                            </span>
                          ) : (
                            <div style={{ display: "grid", gap: 3 }}>
                              {kartHareketleri(k.id).map((h, i) => (
                                <div key={i} className="mono" style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--erp-text)" }}>
                                  <span style={{ color: "var(--erp-text-2)" }}>{tarihYaz(h.tarih)}</span>
                                  <span style={{ color: "var(--erp-text-3)" }}>{h.hesapAd}</span>
                                  <span style={{ flex: 1 }}>{h.aciklama || ""}</span>
                                  {h.fisNo && <span style={{ color: "var(--erp-text-3)" }}>{h.fisNo}</span>}
                                  <span style={{ fontWeight: 700, color: h.yon === "Giriş" ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                                    {h.yon === "Giriş" ? "+" : "−"}{(h.tutar || 0).toLocaleString("tr-TR")}
                                  </span>
                                  {/* Maaş tahakkuku cari hareketidir (personelin kartından yönetilir); burada yalnız kasa/banka hareketi silinir. */}
                                  {h.hesapId && onMuhasebeKaydet && !kartSilGizliMi(kullaniciYetkisiVar, onaySistemiAcikMi(tanimlar)) ? (
                                    <span data-kart-hareket-sil={h.fisNo || h.id || "eski"}><SilOnayButonu onConfirm={() => kartHareketiSil(h)} boyut={11} /></span>
                                  ) : <span style={{ width: 22 }} />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
    </>
    )}
    </div>
  );
}
