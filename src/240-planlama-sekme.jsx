// "Sipariş Planlama" alt sekmesi — bekleyen kalemi olan TÜM satış siparişlerini SOL panelde listeler.
// Her sipariş satırındaki "Üret" ya da "Satın Al" butonuna basıldığında, o sipariş SAĞ paneldeki ilgili
// bölüme (Üret / Satınalma) eklenir — orada, sipariş İÇİNDE zaten kullanılan AYNI bileşen (PlanlamaBolumu
// → PlanlamaSatiri) ile, tıklanan tipe ÖNCEDEN ayarlanmış olarak miktarlar düzenlenip onaylanır. Bu, İKİ
// AYRI mekanizma İCAT ETMEK yerine, var olan tek mantığı (renk bazlı tip + miktar matrisi) yeniden
// kullanır — sadece başlangıç tipi ve giriş noktası farklıdır.
// SagPanelKart, SiparisPlanlamaSekmesi'nin GÖVDESİ DIŞINDA (modül seviyesinde) tanımlanır — bir React
// bileşenini bir başka bileşenin İÇİNDE tanımlamak, HER RENDER'DA YENİ bir fonksiyon referansı (ve
// dolayısıyla React açısından YENİ bir component tipi) yaratır; bu da React'in altındaki tüm alt ağacı
// (burada: PlanlamaBolumu → PlanlamaSatiri, kullanıcının o an düzenlemekte olduğu miktar/tip seçimleri
// dahil) HER RENDER'DA UNMOUNT/REMOUNT etmesine, yani kullanıcının girdiği verilerin SESSİZCE
// SIFIRLANMASINA yol açar. Modül seviyesinde tanımlamak bu riski tamamen ortadan kaldırır.
// "Planlanmış" alt sekmesi — TÜM satış siparişlerindeki, üretime/satınalmaya ZATEN gönderilmiş (henüz
// tam teslim alınmamış) kalemleri, sipariş bazında renk×beden matrisi olarak listeler. Her hücre o
// kalemin durumunu (Üretimde/Satınalmada/Üretildi/Satın Alındı/Kısmen Girildi) gösterir, tıklanınca
// bağlı üretim/satınalma fişine gider — bağlantı silinmişse (Kayıt yok), tıklamak planlamayı temizler.
function PlanlanmisSekmesi({ siparisler, uretim, cariler, onGoToSiparis, onGoToUretim, onPlanlamaTemizle }) {
  const planliSiparisler = (siparisler || [])
    .filter((s) => s.tip === "Satış" && s.durum !== "İptal" && s.kalemler.some((k) => k.planlama))
    .sort((a, b) => new Date(b.olusturuldu || 0) - new Date(a.olusturuldu || 0));

  if (planliSiparisler.length === 0) {
    return <EmptyState text="Henüz planlanmış (üretime/satınalmaya gönderilmiş) bir kalem yok." />;
  }

  function durumHesapla(k) {
    let gerceklesti = false, kismenGirildi = false, bagliSiparis = null, bagliUretim = null;
    if (k.planlama.tip === "Satınalma") {
      bagliSiparis = (siparisler || []).find((s) => s.siparisNo === k.planlama.referansNo);
      gerceklesti = bagliSiparis && bagliSiparis.durum === "Tamamlandı";
      kismenGirildi = bagliSiparis && bagliSiparis.durum === "Kısmi Teslim";
    } else {
      bagliUretim = (uretim || []).find((o) => o.siparisNo === k.planlama.referansNo);
      gerceklesti = bagliUretim && bagliUretim.stogaEklendiMi;
    }
    const referansGecersiz = k.planlama.tip === "Satınalma" ? !bagliSiparis : !bagliUretim;
    const renk = referansGecersiz ? "var(--erp-text-3)" : gerceklesti ? "var(--erp-primary)" : kismenGirildi ? "#C97B3D" : k.planlama.tip === "Üretim" ? "var(--erp-brown)" : "var(--erp-info)";
    const etiket = referansGecersiz
      ? "Kayıt yok"
      : gerceklesti
      ? (k.planlama.tip === "Üretim" ? "Üretildi" : "Alış Fişi Kesildi")
      : kismenGirildi
      ? "Kısmen Girildi"
      : (k.planlama.tip === "Üretim" ? "Üretimde" : "Alış Siparişinde");
    return { gerceklesti, referansGecersiz, renk, etiket, bagliSiparis, bagliUretim };
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 12 }}>
        Üretime ya da satınalmaya gönderilmiş, henüz tamamlanmamış kalemler ({planliSiparisler.length} sipariş) —
        bir hücreye tıklayarak bağlı fişe gidebilirsiniz.
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {planliSiparisler.map((s) => {
          const cari = (cariler || []).find((c) => c.id === s.cariId);
          const planliKalemler = s.kalemler.filter((k) => k.planlama);
          const renkGruplari = [];
          const renkIndex = {};
          planliKalemler.forEach((k) => {
            const anahtar = `${k.urunId}__${k.renk}`;
            if (!(anahtar in renkIndex)) {
              renkIndex[anahtar] = renkGruplari.length;
              renkGruplari.push({ anahtar, urunAd: k.urunAd, renk: k.renk, kalemler: {} });
            }
            // Aynı renk+beden kısmen planlanıp bölünmüş olabilir — bu durumda birden fazla kalem aynı
            // hücreye düşebilir; hepsini bir dizide tutuyoruz.
            if (!renkGruplari[renkIndex[anahtar]].kalemler[k.beden]) renkGruplari[renkIndex[anahtar]].kalemler[k.beden] = [];
            renkGruplari[renkIndex[anahtar]].kalemler[k.beden].push(k);
          });
          const tumBedenler = Array.from(new Set(planliKalemler.map((k) => k.beden)));
          return (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => onGoToSiparis && onGoToSiparis(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--erp-panel)", border: "none", padding: "8px 10px", cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <Truck size={13} color="var(--erp-info)" />
                <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: "var(--erp-info)" }}>{s.siparisNo}</span>
                <span style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 600 }}>{cari ? cari.unvan : "—"}</span>
              </button>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: 10, textAlign: "left", padding: "4px 10px", color: "var(--erp-text-2)" }}>Stok / Renk</th>
                      {tumBedenler.map((b) => (
                        <th key={b} style={{ fontSize: 10, textAlign: "center", padding: "4px 6px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{b}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renkGruplari.map((g) => (
                      <tr key={g.anahtar} style={{ borderTop: "1px solid #F2E8D8" }}>
                        <td style={{ fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600 }}>{g.urunAd}</span>
                          <span className="mono" style={{ color: "var(--erp-text-2)" }}> · {g.renk}</span>
                        </td>
                        {tumBedenler.map((b) => {
                          const kalemlerBurada = g.kalemler[b];
                          if (!kalemlerBurada || kalemlerBurada.length === 0) return <td key={b}></td>;
                          return (
                            <td key={b} style={{ padding: "3px 4px", textAlign: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                                {kalemlerBurada.map((k) => {
                                  const d = durumHesapla(k);
                                  return (
                                    <button
                                      key={k.id}
                                      type="button"
                                      onClick={() => {
                                        if (d.referansGecersiz) { onPlanlamaTemizle && onPlanlamaTemizle(s.id, k.id); return; }
                                        if (k.planlama.tip === "Satınalma" && d.bagliSiparis && onGoToSiparis) onGoToSiparis(d.bagliSiparis.id);
                                        else if (k.planlama.tip === "Üretim" && d.bagliUretim && onGoToUretim) onGoToUretim(d.bagliUretim.id);
                                      }}
                                      title={d.referansGecersiz ? "Bağlı kayıt silinmiş — temizlemek için tıklayın" : `${k.miktar} adet — Fişe git`}
                                      className="mono"
                                      style={{
                                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)",
                                        background: alfaEkle(d.renk, "22"), color: d.renk,
                                        border: d.referansGecersiz ? `1px dashed ${d.renk}` : "none", cursor: "pointer", whiteSpace: "nowrap",
                                      }}
                                    >
                                      {d.gerceklesti && <Check size={9} style={{ display: "inline", verticalAlign: -1 }} />} {d.etiket} ({k.miktar})
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SagPanelKart({ secim, arkaplan, cerceveRenk, cikarFonk, varsayilanTip, siparisler, stok, cariler, uretim, onPlanlaUretim, onPlanlaSatinAlma, onGoToSiparis, onGoToUretim, onPlanlamaTemizle, asortiler, onAsortiOlustur, sonrasindaYonlendir }) {
  // ÖNEMLİ: burada TAM sipariş listesi (siparisler) kullanılır, "bekleyenSiparisler" (dış, sıkı filtreli
  // liste) DEĞİL — çünkü bu satır ARTIK PLANLANMIŞ olsa bile (dolayısıyla dış listeden düşmüş olsa bile),
  // kartın "planlanmış" durumunu (PlanlamaBolumu içindeki rozet) doğru gösterebilmesi ve [X] ile geri
  // alınabilmesi için siparişi bulabilmesi gerekir.
  const s = (siparisler || []).find((x) => x.id === secim.siparisId);
  if (!s) return null;
  // Sadece TIKLANAN satırın (urunId+renk) kalemleri gösterilir — sahte/kopya bir sipariş nesnesi
  // (gerçek id + filtrelenmiş kalemler) oluşturulur. onPlanlaUretim/onPlanlaSatinAlma çağrıları GERÇEK
  // sipariş id'sini kullanır ve GERÇEK veriden okur — bu filtreleme sadece BURADA hangi kalemlerin
  // gösterileceğini belirler, veri tabanı işlemini asla etkilemez.
  const ilgiliKalemler = s.kalemler.filter((k) => k.urunId === secim.urunId && k.renk === secim.renk);
  if (ilgiliKalemler.length === 0) return null;
  const odakliSiparis = { ...s, kalemler: ilgiliKalemler };
  const cari = (cariler || []).find((c) => c.id === s.cariId);
  const urun = (stok || []).find((p) => p.id === secim.urunId);

  // [X] butonu: eğer bu satırdaki kalemler ARTIK planlanmışsa (kullanıcı zaten Onayla'ya bastıysa),
  // panelden kaldırmak GERÇEKTEN planlamayı geri alır (onPlanlamaTemizle çağrılır) — bu, kalemi tekrar
  // "bekleyen" durumuna döndürür ve sol tarafta yeniden görünmesini sağlar. Henüz onaylanmamışsa (hâlâ
  // form aşamasındaysa), sadece bu panelden (yerel görünümden) kaldırılır — zaten planlanmış bir şey yok.
  function kaldirVeGeriAl() {
    const planlanmisOlanlar = ilgiliKalemler.filter((k) => k.planlama);
    planlanmisOlanlar.forEach((k) => onPlanlamaTemizle && onPlanlamaTemizle(s.id, k.id));
    cikarFonk(secim);
  }

  return (
    <div style={{ background: arkaplan, border: `1px solid ${cerceveRenk}`, borderRadius: "var(--erp-r-md)", padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{s.siparisNo}</span>
        <span style={{ fontSize: 11, color: "var(--erp-text)" }}>{cari ? cari.unvan : "—"}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>· {urun ? urun.ad : secim.urunId} · {secim.renk}</span>
        <button type="button" onClick={kaldirVeGeriAl} title="Panelden kaldır — henüz onaylanmadıysa sadece görünümden çıkar, onaylandıysa planlamayı geri alır" style={{ marginLeft: "auto", border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex" }}>
          <X size={13} />
        </button>
      </div>
      <PlanlamaBolumu
        siparis={odakliSiparis}
        stok={stok}
        cariler={cariler}
        tumSiparisler={siparisler}
        uretimSiparisleri={uretim}
        onPlanlaUretim={onPlanlaUretim}
        onPlanlaSatinAlma={onPlanlaSatinAlma}
        onSiparisGit={onGoToSiparis}
        onGoToUretim={onGoToUretim}
        onPlanlamaTemizle={onPlanlamaTemizle}
        asortiler={asortiler}
        onAsortiOlustur={onAsortiOlustur}
        varsayilanTip={varsayilanTip}
        sonrasindaYonlendir={sonrasindaYonlendir}
      />
    </div>
  );
}

function SiparisPlanlamaSekmesi({ siparisler, stok, cariler, uretim, asortiler, onGoToSiparis, onGoToUretim, onPlanlaUretim, onPlanlaSatinAlma, onPlanlamaTemizle, onAsortiOlustur }) {
  const [icSekme, setIcSekme] = useState("bekleyen"); // "bekleyen" | "planlanmis"
  // ÖNEMLİ: artık TÜM sipariş değil, TIKLANAN satırın (sipariş+ürün+renk) kendisi seçiliyor — kullanıcı
  // "sadece o satırın işlemi açılsın" istedi, bu yüzden bütün siparişi değil, o renge ait kalemleri
  // sağ panele gönderiyoruz.
  const [uretimSecilenler, setUretimSecilenler] = useState([]); // [{siparisId, urunId, renk}]
  const [satinalmaSecilenler, setSatinalmaSecilenler] = useState([]);

  // ÖNEMLİ: bir kalem "kalan > 0" olsa bile, ZATEN planlanmışsa (k.planlama doluysa — üretime ya da
  // satınalmaya gönderilmiş, henüz teslim alınmamış) artık "planlanacak" bir şey DEĞİLDİR — sol listede
  // TEKRAR görünmemesi gerekir (aksi halde kullanıcı aynı satırı ikinci kez planlamaya kalkışabilir).
  const bekleyenSiparisler = (siparisler || [])
    .filter((s) => s.tip === "Satış" && s.durum !== "İptal" && s.kalemler.some((k) => k.miktar - (k.karsilanan || 0) > 0 && !k.planlama))
    .sort((a, b) => new Date(a.teslimTarihi || "9999-12-31") - new Date(b.teslimTarihi || "9999-12-31"));

  function satirAnahtari(secim) { return `${secim.siparisId}|${secim.urunId}|${secim.renk}`; }

  // Sağ paneldeki bir satır, SADECE o kalem GERÇEKTEN tamamen karşılandığında (kalan=0, yani teslim
  // alındığında) otomatik kaybolur. Planlanmış AMA HENÜZ TESLİM ALINMAMIŞ bir satır (kalan hâlâ >0),
  // "Onayla" sonrası da sağ panelde (artık "planlanmış" rozetiyle) GÖRÜNMEYE DEVAM EDER — kullanıcı
  // isterse [X] ile bilinçli olarak çıkarır (bu, planlamayı da geri alır, bkz. SagPanelKart).
  function halaBekliyorMu(secim) {
    const s = (siparisler || []).find((x) => x.id === secim.siparisId);
    if (!s) return false;
    return s.kalemler.some((k) => k.urunId === secim.urunId && k.renk === secim.renk && k.miktar - (k.karsilanan || 0) > 0);
  }
  const uretimGosterilecek = uretimSecilenler.filter(halaBekliyorMu);
  const satinalmaGosterilecek = satinalmaSecilenler.filter(halaBekliyorMu);

  function uretEkle(secim) {
    setUretimSecilenler((prev) => (prev.some((x) => satirAnahtari(x) === satirAnahtari(secim)) ? prev : [...prev, secim]));
  }
  function satinAlEkle(secim) {
    setSatinalmaSecilenler((prev) => (prev.some((x) => satirAnahtari(x) === satirAnahtari(secim)) ? prev : [...prev, secim]));
  }
  function uretimdenCikar(secim) {
    setUretimSecilenler((prev) => prev.filter((x) => satirAnahtari(x) !== satirAnahtari(secim)));
  }
  function satinalmadanCikar(secim) {
    setSatinalmaSecilenler((prev) => prev.filter((x) => satirAnahtari(x) !== satirAnahtari(secim)));
  }
  function satirSeciliMi(liste, secim) {
    return liste.some((x) => satirAnahtari(x) === satirAnahtari(secim));
  }

  const IC_SEKMELER = [
    { key: "bekleyen", label: "Bekleyen" },
    { key: "planlanmis", label: "Planlanmış" },
  ];
  const sekmeSecici = (
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      {IC_SEKMELER.map((sk) => {
        const aktif = icSekme === sk.key;
        return (
          <button
            key={sk.key}
            type="button"
            onClick={() => setIcSekme(sk.key)}
            style={{
              padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${aktif ? "#C97B3D" : "var(--erp-border)"}`,
              background: aktif ? "#C97B3D1A" : "#fff",
              color: aktif ? "#C97B3D" : "var(--erp-text)",
            }}
          >
            {sk.label}
          </button>
        );
      })}
    </div>
  );

  if (icSekme === "planlanmis") {
    return (
      <div>
        {sekmeSecici}
        <PlanlanmisSekmesi
          siparisler={siparisler}
          uretim={uretim}
          cariler={cariler}
          onGoToSiparis={onGoToSiparis}
          onGoToUretim={onGoToUretim}
          onPlanlamaTemizle={onPlanlamaTemizle}
        />
      </div>
    );
  }

  if (bekleyenSiparisler.length === 0) {
    return (
      <div>
        {sekmeSecici}
        <EmptyState text="Planlanması gereken (bekleyen kalemi olan) bir satış siparişi yok." />
      </div>
    );
  }

  return (
    <div>
      {sekmeSecici}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* SOL: stok/renk/beden bazlı matris — her satırın kendi Üret/Satın Al butonu var. Bir satıra
          tıklamak, o satırın AİT OLDUĞU siparişin TAMAMINI sağ panele gönderir — asıl renk/beden bazlı
          Üretim/Satınalma seçimi, sağ panelde AÇILAN aynı Tedarik Planlama bileşeninde (PlanlamaBolumu)
          yapılır; burada İKİ AYRI mekanizma icat edilmez, sadece hangi siparişin sağ panele gönderileceğine
          dair daha DETAYLI (satır bazlı) bir giriş noktası sağlanır.
       */}
      <div style={{ flex: "1 1 480px", minWidth: 340 }}>
        <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 12 }}>
          Bekleyen kalemi olan tüm satış siparişlerinin ürün/renk/beden satırları ({bekleyenSiparisler.length} sipariş) —
          bir satırdaki "Üret" ya da "Satın Al" ile SADECE O SATIRI (o ürün/rengi) sağ panele gönderin.
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {bekleyenSiparisler.map((s) => {
            const cari = (cariler || []).find((c) => c.id === s.cariId);
            // Sol listede SADECE gerçekten planlanmayı bekleyen (henüz üretime/satınalmaya
            // gönderilmemiş) kalemler gösterilir — planlanmış olanlar artık burada tekrar görünmez.
            const bekleyenKalemler = s.kalemler.filter((k) => k.miktar - (k.karsilanan || 0) > 0 && !k.planlama);
            return (
              <div key={s.id} style={{ background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => onGoToSiparis && onGoToSiparis(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--erp-panel)", border: "none", padding: "8px 10px", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <Truck size={13} color="var(--erp-info)" />
                  <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: "var(--erp-info)" }}>{s.siparisNo}</span>
                  <span style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 600 }}>{cari ? cari.unvan : "—"}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Teslim: {s.teslimTarihi ? tarihYaz(s.teslimTarihi) : "—"}</span>
                </button>
                <div style={{ overflowX: "auto" }}>
                  {(() => {
                    // Tedarik Planlama ekranındaki AYNI yatay matris düzeni: satırlar = ürün+renk,
                    // sütunlar = TÜM bedenlerin birleşimi. "Stok, renk, beden" tek tek satır satır
                    // tekrarlanan bir liste yerine, her rengin tüm bedenleri tek satırda yan yana.
                    const renkGruplari = [];
                    const renkIndex = {};
                    bekleyenKalemler.forEach((k) => {
                      const anahtar = `${k.urunId}__${k.renk}`;
                      if (!(anahtar in renkIndex)) {
                        renkIndex[anahtar] = renkGruplari.length;
                        renkGruplari.push({ anahtar, urunId: k.urunId, urunAd: k.urunAd, renk: k.renk, bedenler: {} });
                      }
                      renkGruplari[renkIndex[anahtar]].bedenler[k.beden] = k.miktar - (k.karsilanan || 0);
                    });
                    const tumBedenler = Array.from(new Set(bekleyenKalemler.map((k) => k.beden)));
                    return (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ fontSize: 10, textAlign: "left", padding: "4px 10px", color: "var(--erp-text-2)" }}>Stok / Renk</th>
                            {tumBedenler.map((b) => (
                              <th key={b} style={{ fontSize: 10, textAlign: "center", padding: "4px 6px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{b}</th>
                            ))}
                            <th style={{ fontSize: 10, textAlign: "right", padding: "4px 10px", color: "var(--erp-text-2)" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {renkGruplari.map((g) => {
                            const secim = { siparisId: s.id, urunId: g.urunId, renk: g.renk };
                            const uretimde = satirSeciliMi(uretimSecilenler, secim);
                            const satinalmada = satirSeciliMi(satinalmaSecilenler, secim);
                            return (
                            <tr key={g.anahtar} style={{ borderTop: "1px solid #F2E8D8" }}>
                              <td style={{ fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap" }}>
                                <span style={{ fontWeight: 600 }}>{g.urunAd}</span>
                                <span className="mono" style={{ color: "var(--erp-text-2)" }}> · {g.renk}</span>
                              </td>
                              {tumBedenler.map((b) => (
                                <td key={b} className="mono" style={{ fontSize: 11, padding: "5px 6px", textAlign: "center", color: g.bedenler[b] != null ? "var(--erp-text)" : "var(--erp-border)", fontWeight: g.bedenler[b] != null ? 700 : 400 }}>
                                  {g.bedenler[b] != null ? g.bedenler[b] : "—"}
                                </td>
                              ))}
                              <td style={{ padding: "5px 10px" }}>
                                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => uretEkle(secim)}
                                    disabled={uretimde}
                                    title="Sadece bu satırı Üret paneline gönder"
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "center", padding: "3px 6px", borderRadius: "var(--erp-r-sm)",
                                      cursor: uretimde ? "default" : "pointer",
                                      border: `1.5px solid ${uretimde ? "#8FA888" : "var(--erp-primary)"}`,
                                      background: uretimde ? "#4E6B4E22" : "#fff", color: "var(--erp-primary)",
                                    }}
                                  >
                                    <Hammer size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => satinAlEkle(secim)}
                                    disabled={satinalmada}
                                    title="Sadece bu satırı Satınalma paneline gönder"
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "center", padding: "3px 6px", borderRadius: "var(--erp-r-sm)",
                                      cursor: satinalmada ? "default" : "pointer",
                                      border: `1.5px solid ${satinalmada ? "#9BB0C4" : "var(--erp-info)"}`,
                                      background: satinalmada ? "#3D6B8A22" : "#fff", color: "var(--erp-info)",
                                    }}
                                  >
                                    <PackageCheck size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAĞ: Üret + Satınalma bölümleri, alt alta */}
      <div style={{ flex: "1 1 420px", minWidth: 320, display: "grid", gap: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Hammer size={15} color="var(--erp-primary)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-primary)" }}>Üret</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>({uretimGosterilecek.length})</span>
          </div>
          {uretimGosterilecek.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", fontStyle: "italic", padding: "6px 0" }}>
              Henüz bir sipariş eklenmedi — soldan "Üret" ile ekleyin.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {uretimGosterilecek.map((secim) => (
                <SagPanelKart
                  key={satirAnahtari(secim)} secim={secim} cerceveRenk="#8FA888" arkaplan="#F0F5EE" cikarFonk={uretimdenCikar}
                  varsayilanTip="Uretim"
                  stok={stok} cariler={cariler} siparisler={siparisler} uretim={uretim}
                  onPlanlaUretim={onPlanlaUretim} onPlanlaSatinAlma={onPlanlaSatinAlma}
                  onGoToSiparis={onGoToSiparis} onGoToUretim={onGoToUretim}
                  onPlanlamaTemizle={onPlanlamaTemizle} asortiler={asortiler} onAsortiOlustur={onAsortiOlustur}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <PackageCheck size={15} color="var(--erp-info)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-info)" }}>Satınalma</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>({satinalmaGosterilecek.length})</span>
          </div>
          {satinalmaGosterilecek.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", fontStyle: "italic", padding: "6px 0" }}>
              Henüz bir sipariş eklenmedi — soldan "Satın Al" ile ekleyin.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {satinalmaGosterilecek.map((secim) => (
                <SagPanelKart
                  key={satirAnahtari(secim)} secim={secim} cerceveRenk="#9BB0C4" arkaplan="#EAF1F6" cikarFonk={satinalmadanCikar}
                  varsayilanTip="Satınalma"
                  stok={stok} cariler={cariler} siparisler={siparisler} uretim={uretim}
                  onPlanlaUretim={onPlanlaUretim} onPlanlaSatinAlma={onPlanlaSatinAlma}
                  onGoToSiparis={onGoToSiparis} onGoToUretim={onGoToUretim}
                  onPlanlamaTemizle={onPlanlamaTemizle} asortiler={asortiler} onAsortiOlustur={onAsortiOlustur}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

