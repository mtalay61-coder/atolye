function NavItem({ icon, label, active, onClick, renk = "var(--erp-orange)", rozet }) {
  // `title` HER ZAMAN yazılıyor: düğmenin adı testlere ve ekran okuyuculara görünsün (14 Eylül).
  // YENİ TASARIM (v1.449.0): üst menünün açılır listesindeki öğe. Seçili öğe açık kırmızı zemin +
  // kırmızı yazı (tek vurgu rengi); ikon modülün kendi renginde, modüller ayırt edilebilsin.
  return (
    <button
      type="button"
      title={label}
      data-nav={label}
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        height: 38, padding: "0 10px", border: "none", borderRadius: "var(--erp-r-md)",
        background: active ? "var(--erp-accent-tint)" : "transparent",
        color: active ? "var(--erp-accent)" : "var(--erp-text)",
        fontSize: 14, fontWeight: active ? 700 : 500, cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "flex", color: active ? "var(--erp-accent)" : renk }}>{icon}</span>
      {label}
      {rozet > 0 && (
        <span className="mono" data-nav-rozet={rozet} title={`${rozet} açık`}
          style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "0 6px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-accent)", color: "#fff" }}>
          {rozet}
        </span>
      )}
    </button>
  );
}

/* ================= ANASAYFA MODÜLÜ ================= */

// ---------------------------------------------------------------------------------------------
// GECİKEN İŞLER PANELİ
//
// Ana sayfadaki sayaç kartları "6 açık sipariş" der ama HANGİSİNİN geciktiğini söylemez. Bu panel
// tam olarak o boşluğu doldurur: bugüne göre gecikmiş ya da yaklaşan her şeyi tek listede, aciliyet
// sırasına göre ve tıklanabilir olarak gösterir.
//
// Tasarım kararı: "yaklaşanlar" da gösteriliyor ama gecikmişlerden AYRI renkte. Sadece gecikmişleri
// göstermek, sorunu önlemek yerine olduktan sonra bildirmek olurdu.
function GecikenIslerPaneli({ siparisler, uretim, stok, cariler, muhasebe, onGoToSiparis, onGoToUretim, onGoToUrun }) {
  const [acikMi, setAcikMi] = useState(true);

  // Gün farkı, SAAT bileşeni sıfırlanarak hesaplanır — yoksa "bugün teslim" olan bir iş, saate
  // bağlı olarak bazen gecikmiş bazen değil görünürdü.
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const gunFarki = (tarihStr) => {
    if (!tarihStr) return null;
    const t = new Date(tarihStr);
    if (isNaN(t)) return null;
    t.setHours(0, 0, 0, 0);
    return Math.round((t - bugun) / 86400000);
  };

  const kalemler = [];

  // 1) Teslim tarihi geçmiş / yaklaşan siparişler
  (siparisler || []).forEach((s) => {
    if (s.durum === "Tamamlandı" || s.durum === "İptal") return;
    const g = gunFarki(s.teslimTarihi);
    if (g === null || g > 7) return;
    const cari = (cariler || []).find((c) => c.id === s.cariId);
    kalemler.push({
      tur: s.tip === "Satış" ? "Satış siparişi" : "Alış siparişi",
      baslik: `${s.siparisNo}${cari ? " · " + cari.unvan : ""}`,
      ozet: `${(s.kalemler || []).length} kalem · ${s.durum}`,
      gun: g,
      renk: s.tip === "Satış" ? "#8A3D6B" : "var(--erp-info)",
      tikla: () => onGoToSiparis && onGoToSiparis(s.id),
    });
  });

  // 2) Termini geçmiş üretim siparişleri
  (uretim || []).forEach((o) => {
    if (o.stogaEklendiMi) return;
    const g = gunFarki(o.termin);
    if (g === null || g > 7) return;
    const toplam = (o.bedenMiktarlari || []).reduce((t, bm) => t + (bm.miktar || 0), 0);
    const tamamlanan = (o.prosesIlerleme || []).filter((p) => p.tamamlandiMi).length;
    const toplamProses = (o.prosesIlerleme || []).length;
    kalemler.push({
      tur: "Üretim",
      baslik: `${o.siparisNo} · ${o.urunAd || o.model || ""}${o.renk ? " · " + o.renk : ""}`,
      ozet: `${toplam} adet · ${tamamlanan}/${toplamProses} proses tamam`,
      gun: g,
      renk: "#C97B3D",
      tikla: () => onGoToUretim && onGoToUretim(o.id),
    });
  });

  // 3) Vadesi gelen/geçen çekler
  ((muhasebe && muhasebe.cekler) || []).forEach((c) => {
    if (c.durum !== "Portföyde") return;
    const g = gunFarki(c.vadeTarihi);
    if (g === null || g > 7) return;
    const cekCari = (cariler || []).find((x) => x.id === c.cariId);
    kalemler.push({
      tur: c.tip === "Verilen" ? "Verilen çek" : "Alınan çek",
      baslik: `${c.cekNo || "Çek"}${cekCari ? " · " + cekCari.unvan : ""}`,
      ozet: `${(c.tutar || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[c.paraBirimi || "TRY"] || ""}`,
      gun: g,
      renk: "var(--erp-brown)",
      tikla: null,
    });
  });

  // Aciliyet sırası: en çok gecikmiş en üstte.
  kalemler.sort((a, b) => a.gun - b.gun);
  const gecikenSayisi = kalemler.filter((k) => k.gun < 0).length;

  // 4) Kritik stok — tarihsel değil, bu yüzden ayrı sayılır ve listeye karışmaz.
  const kritikler = [];
  (stok || []).forEach((p) => {
    (p.variants || []).forEach((v) => {
      if ((v.minStok || 0) > 0 && v.miktar < v.minStok) {
        kritikler.push({ urun: p, renk: v.renk, beden: v.beden, miktar: v.miktar, minStok: v.minStok });
      }
    });
  });

  if (kalemler.length === 0 && kritikler.length === 0) {
    return (
      <div style={{ background: "#F1F6F0", border: "1px solid #C4D6C0", borderRadius: "var(--erp-r-lg)", padding: 14, marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
        <Check size={16} color="var(--erp-primary)" />
        <span style={{ fontSize: 13, color: "#3F5A3F", fontWeight: 600 }}>
          Geciken iş yok — teslim tarihleri, üretim terminleri, çek vadeleri ve stok seviyeleri normal.
        </span>
      </div>
    );
  }

  const gunEtiketi = (g) =>
    g < 0 ? `${Math.abs(g)} gün gecikti` : g === 0 ? "bugün" : `${g} gün kaldı`;

  return (
    <div style={{ background: "#fff", border: `1px solid ${gecikenSayisi > 0 ? "var(--erp-orange)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-lg)", marginBottom: 28, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setAcikMi((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: gecikenSayisi > 0 ? "var(--erp-orange-bg)" : "var(--erp-panel)", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <AlertTriangle size={16} color={gecikenSayisi > 0 ? "var(--erp-warn)" : "var(--erp-brown)"} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", flex: 1 }}>
          Dikkat gerektirenler
        </span>
        {gecikenSayisi > 0 && (
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-warn)", color: "#fff" }}>
            {gecikenSayisi} gecikmiş
          </span>
        )}
        {kritikler.length > 0 && (
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E22", color: "var(--erp-warn)" }}>
            {kritikler.length} kritik stok
          </span>
        )}
        {acikMi ? <ChevronUp size={16} color="var(--erp-text-3)" /> : <ChevronDown size={16} color="var(--erp-text-3)" />}
      </button>

      {acikMi && (
        <div style={{ padding: "10px 16px 14px" }}>
          {kalemler.length > 0 && (
            <div style={{ display: "grid", gap: 6, marginBottom: kritikler.length > 0 ? 14 : 0 }}>
              {kalemler.map((k, i) => {
                const gecikti = k.gun < 0;
                const bugunMu = k.gun === 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => k.tikla && k.tikla()}
                    disabled={!k.tikla}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%",
                      background: gecikti ? "var(--erp-orange-bg)" : bugunMu ? "var(--erp-hover)" : "var(--erp-panel)",
                      border: `1px solid ${gecikti ? "#E0B4A4" : "var(--erp-border-2)"}`,
                      borderLeft: `3px solid ${k.renk}`,
                      borderRadius: "var(--erp-r-md)", cursor: k.tikla ? "pointer" : "default", textAlign: "left",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: k.renk, minWidth: 86, whiteSpace: "nowrap" }}>
                      {k.tur}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", display: "block", overflowWrap: "anywhere" }}>{k.baslik}</span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{k.ozet}</span>
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                        color: gecikti ? "var(--erp-warn)" : bugunMu ? "var(--erp-brown)" : "var(--erp-text-2)",
                      }}
                    >
                      {gunEtiketi(k.gun)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {kritikler.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>
                Minimum seviyenin altındakiler
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {kritikler.slice(0, 14).map((k, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onGoToUrun && onGoToUrun(k.urun.id)}
                    className="mono"
                    title={`${olcuMetni([k.urun.ad, k.renk, k.beden])} — mevcut ${k.miktar}, minimum ${k.minStok}`}
                    style={{
                      fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: "var(--erp-r-pill)",
                      border: "1px solid #E0B4A4", background: "var(--erp-orange-bg)", color: "var(--erp-warn)", cursor: "pointer",
                    }}
                  >
                    {/* matris-muaf: tek satırlık uyarı rozeti, tablo değil. */}
                    {k.urun.ad} · {k.renk} · {k.beden}: {k.miktar}/{k.minStok}
                  </button>
                ))}
                {kritikler.length > 14 && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", alignSelf: "center" }}>
                    +{kritikler.length - 14} daha
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// SON İŞLEMLER — "kim ne yaptı" akışı.
//
// KAYIT TUTULMUYOR, VERİDEN TÜRETİLİYOR. Ayrı bir "işlem günlüğü" tablosu tutmak, her yeni işlem
// yolunda oraya da yazmayı hatırlamayı gerektirirdi — bu projede tam olarak bu tür "iki yere yaz"
// düzenlerinden hata çıktı. Cari hareketleri, stok hareketleri ve siparişler zaten ne olduğunu,
// ne zaman olduğunu ve (artık) kimin yaptığını taşıyor; akış bunlardan okunuyor.
//
// `kullanici` alanı v1.73.0'da eklendi; daha eski kayıtlarda yok ve "—" gösteriliyor. Uydurma bir
// isim yazmak, denetim kaydını güvenilmez yapardı.
// Tutar biçimleyicisi bir kez: `toLocaleString(..., {seçenek})` her fiş için yeni Intl kuruyordu.
const SON_ISLEM_TUTAR_BICIM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

function SonIslemlerPaneli({ cariler, stok, siparisler, muhasebe, onGoToCari, onGoToSiparis, onGoToUrun, onNavigate }) {
  const [kisiSuzgec, setKisiSuzgec] = useState("");
  const [turSuzgec, setTurSuzgec] = useState("");
  // KAPALI AÇILIR. Ana sayfa bir ÖZET ekranı; on iki satırlık akış onu aşağı itiyordu.
  // Başlıkta kaç kayıt olduğu ve son işlemin ne olduğu yazıyor — açmadan da bir şey söylüyor.
  const [acik, setAcik] = useState(false);
  const [limit, setLimit] = useState(20);

  // HESAP VERİYE BAĞLI ÖNBELLEKTE (v1.633.0): akış BÜTÜN cari/stok hareketlerini ve siparişleri dolaşıyor;
  // büyük veriyle ana sayfanın en pahalı parçasıydı ve her çizimde (süzgeç seçmek, "daha fazla") baştan
  // kuruluyordu. Yalnız veri değişince yeniden kuruluyor. Git düğmeleri o anki işleyicileri ref'ten okuyor —
  // önbellekteki kapanış eski bir işleyiciye bağlı kalmasın.
  const gitRef = useRef(null);
  gitRef.current = { cari: onGoToCari, siparis: onGoToSiparis, urun: onGoToUrun, sekme: onNavigate };
  const olaylar = React.useMemo(() => {
    const olaylar = [];
    // Saati olmayan kayıt (yalnız gün): "T00:00Z" eklemek ekranda uydurma "03:00" gösteriyordu (v1.688.10) — yalnız gün
    // döner; sıralamada aynı günün saatli kayıtlarının altında kalır.
    const zamanAl = (h) => h.zaman || (h.tarih ? (String(h.tarih).length > 10 ? h.tarih : String(h.tarih).slice(0, 10)) : null);

    // FİŞ BAŞINA TEK SATIR (kullanıcı, 9 Eylül: "fişleri satır olarak gir, tek fiş görünsün").
    //
    // Cari hareketleri KALEM kalem tutuluyor: beş kalemli bir satış fişi akışta beş satır üretiyordu
    // ve hepsi aynı fiş numarasını taşıdığı için liste kendini tekrar ediyor gibi görünüyordu.
    // Kullanıcı ekran görüntüsünde aynı fişi (SF-20260909-001) üç kez gördü.
    //
    // Fiş numarası olanlar TEK SATIRDA toplanıyor: tutarlar toplanıyor, ürün adları birleşiyor.
    // Fiş numarası OLMAYAN kayıt tek başına duruyor — onu neye göre gruplayacağımızı bilmiyoruz.
    //
    // GRUP ANAHTARI cari + fiş no: aynı fiş numarası iki ayrı caride görünse bile (fiş sayacı
    // tipe göre ilerliyor) karışmasınlar.
    (cariler || []).forEach((c) => {
      const gruplar = new Map();
      (c.hareketler || []).forEach((h) => {
        // ESKİ VERİ İSTİSNASI. Yeni kayıtlarda "Muhasebe" TEK satır; bu satır yalnızca göç öncesi
        // yazılmış, hâlâ eşi duran ikizler için var — ikinci kopya akışta iki kez görünmesin.
        // Göç (`esIkizleriBirlestir`) açılışta çalıştığı için normalde hiç tetiklenmiyor.
        if ((h.defter || "Genel") === "Resmi" && h.esId) return;
        const anahtar = h.fisNo ? `${c.id}|${h.fisNo}` : `tekil|${h.id}`;
        const oncekiler = gruplar.get(anahtar);
        if (oncekiler) oncekiler.push(h);
        else gruplar.set(anahtar, [h]);
      });

      gruplar.forEach((hareketler) => {
        const ilk = hareketler[0];
        const satis = ilk.yon === "Borç";
        // TÜR ÖNCE ALANDAN (kullanıcı, 17 Eylül: "burada ödemeler alış diye görünüyor").
        // Tür açıklama metninden tahmin ediliyordu; muhasebe ekranından girilen ödemenin açıklaması
        // "Ödeme (TL Kasa)" yerine başka bir şey olunca satır "Satış" görünüyordu. `islemTipi` alanı
        // 17 Eylül'de eklendi (207-kasa-cari-ortak) — varsa o kazanır, yoksa eski tahmin sürer.
        const islemTipi = ilk.islemTipi || null;
        const odemeMi = islemTipi
          ? (islemTipi === "Ödeme" || islemTipi === "Tahsilat")
          : (/Ödeme|Tahsilat/i.test(ilk.aciklama || "") || (ilk.fisNo || "").startsWith("OTO")
             || /^(ODM|THS)-/.test(ilk.fisNo || ""));
        // Toplam, kalemlerin tutarlarından. Para birimi karışıksa (nadir) ilk kalemin birimi
        // gösteriliyor — fişin kayıt para birimi zaten tek olmalı.
        const toplam = hareketler.reduce((t, h) => t + (h.tutar || 0), 0);
        // Ürün adları TEKİLLEŞTİRİLİYOR: aynı ürünün üç bedeni "Bot · Bot · Bot" değil "Bot" yazsın.
        const urunler = [...new Set(hareketler.map((h) => (h.urunAd ? `${h.urunAd}${h.renk ? " · " + h.renk : ""}` : "")).filter(Boolean))];
        const kalemNotu = hareketler.length > 1 ? `${hareketler.length} kalem` : "";
        olaylar.push({
          // En yeni kalemin zamanı: fişin akıştaki yeri son hareketine göre.
          zaman: hareketler.map(zamanAl).filter(Boolean).sort().pop() || zamanAl(ilk),
          kullanici: ilk.kullanici || null,
          tur: islemTipi || (odemeMi ? (satis ? "Ödeme" : "Tahsilat") : (satis ? "Satış" : "Alış")),
          renk: odemeMi ? "var(--erp-primary)" : (satis ? "var(--erp-info)" : "var(--erp-brown)"),
          metin: `${c.unvan} · ${SON_ISLEM_TUTAR_BICIM.format(toplam)} ${PARA_SEMBOLU[ilk.paraBirimi || "TRY"] || ""}`,
          alt: [ilk.fisNo, kalemNotu, urunler.slice(0, 3).join(" · ")].filter(Boolean).join(" · "),
          git: () => gitRef.current.cari && gitRef.current.cari(c.id),
        });
      });
    });

    (stok || []).forEach((p) => {
      (p.hareketler || []).forEach((h) => {
        // Fişli hareketlerin cari karşılığı zaten yukarıda; akışa yalnızca cari karşılığı OLMAYANLAR
        // giriyor (üretim çıkışı/girişi, sayım, elle düzeltme). Aksi halde her fiş iki satır olurdu.
        if (h.cariId) return;
        olaylar.push({
          zaman: zamanAl(h),
          kullanici: h.kullanici || null,
          tur: h.kaynak || "Stok",
          renk: h.miktar < 0 ? "var(--erp-warn)" : "var(--erp-primary)",
          metin: `${p.ad} · ${h.renk || ""}${h.beden ? " " + h.beden : ""}`.trim(),
          alt: `${h.miktar > 0 ? "+" : ""}${h.miktar} ${p.birim || ""}${h.fisNo ? " · " + h.fisNo : ""}`,
          git: () => gitRef.current.urun && gitRef.current.urun(p.id),
        });
      });
    });

    // KASA / BANKA HAREKETLERİ (v1.688.6 — kullanıcı: "son işlemler düzgün çalışmıyor"): yalnız cari hareketleri ve stok
    // dolaşılıyordu; cariye bağlı OLMAYAN para hareketleri (gelir/gider kartı ödemeleri, virman, elle kasa girişi) akışa
    // hiç girmiyordu — bugün yapılan gider ödemeleri görünmüyordu. Cariye bağlı olanlar (`muhasebeBagId`/`cariId`) cari
    // tarafında zaten bir satır; ikinci kez yazılmaz. Virmanın iki ayağı tek satır (bağ kimliğiyle).
    const virmanGorulen = new Set();
    [...((muhasebe && muhasebe.kasalar) || []).map((hs) => [hs, "Kasa"]), ...((muhasebe && muhasebe.bankalar) || []).map((hs) => [hs, "Banka"])]
      .forEach(([hs, hesapTuru]) => (hs.hareketler || []).forEach((x) => {
        if (x.cariId || (x.muhasebeBagId && !x.virmanMi)) return;
        if (x.virmanMi) { if (virmanGorulen.has(x.muhasebeBagId)) return; virmanGorulen.add(x.muhasebeBagId); }
        const tur = x.virmanMi ? "Virman" : x.giderKartId ? (x.yon === "Giriş" ? "Gelir" : "Gider") : (x.yon === "Giriş" ? "Kasa girişi" : "Kasa çıkışı");
        olaylar.push({
          zaman: zamanAl(x),
          kullanici: x.kullanici || null,
          tur,
          renk: x.yon === "Giriş" ? "var(--erp-primary)" : "var(--erp-warn)",
          metin: `${x.giderKartAd || x.aciklama || hs.ad} · ${SON_ISLEM_TUTAR_BICIM.format(Number(x.tutar) || 0)} ${PARA_SEMBOLU[hs.paraBirimi || "TRY"] || ""}`,
          alt: [x.fisNo, `${hesapTuru}: ${hs.ad}`, x.giderKartAd && x.aciklama !== x.giderKartAd ? x.aciklama : ""].filter(Boolean).join(" · "),
          git: () => gitRef.current.sekme && gitRef.current.sekme(x.giderKartId ? "gelirgider" : "muhasebe"),
        });
      }));

    (siparisler || []).forEach((sp) => {
      if (!sp.olusturuldu && !sp.tarih) return;
      olaylar.push({
        zaman: sp.olusturuldu || `${sp.tarih}T00:00:00.000Z`,
        kullanici: sp.olusturan || null,
        tur: `${sp.tip} siparişi`,
        renk: sp.tip === "Satış" ? "#8A3D6B" : "var(--erp-info)",
        // CARİ ADI VE TUTAR (v1.688.10 — kullanıcı: "son işlemlerde cari adı ve tutar yazılsın"): tutar kalemlerin
        // miktar × birim fiyatı, para birimi başına (karışık birimler toplanmaz).
        metin: (() => {
          const c = (cariler || []).find((x) => x.id === sp.cariId);
          const t = {};
          (sp.kalemler || []).forEach((k) => { const pb = k.paraBirimi || "TRY"; t[pb] = (t[pb] || 0) + (Number(k.miktar) || 0) * (Number(k.birimFiyat) || 0); });
          const tutar = Object.entries(t).filter(([, v]) => v).map(([pb, v]) => `${SON_ISLEM_TUTAR_BICIM.format(v)} ${PARA_SEMBOLU[pb] || pb}`).join(" · ");
          return [c ? c.unvan : "", tutar].filter(Boolean).join(" · ") || sp.siparisNo;
        })(),
        alt: [sp.siparisNo, `${(sp.kalemler || []).length} kalem`, sp.durum || ""].filter(Boolean).join(" · "),
        git: () => gitRef.current.siparis && gitRef.current.siparis(sp.id),
      });
    });

    olaylar.sort((a, b) => String(b.zaman || "").localeCompare(String(a.zaman || "")));
    return olaylar;
  }, [cariler, stok, siparisler, muhasebe]);

  const kisiler = Array.from(new Set(olaylar.map((o) => o.kullanici).filter(Boolean)));

  // TÜR SEKMELERİ — Alış, Satış, Tahsilat, Ödeme, Üretim, sipariş…
  //
  // Akış karışık geliyordu: bir tahsilatı ararken araya üretim hareketleri giriyordu. Sekmeler
  // OLAY TÜRLERİNDEN türetiliyor, sabit bir liste yok: yeni bir tür eklendiğinde sekmesi de
  // kendiliğinden çıkıyor (sabit liste, eklenen türü sessizce gizlerdi).
  //
  // Sayılar KİŞİ SÜZGECİNDEN SONRA hesaplanıyor: "Ahmet" seçiliyken "Satış (3)" yazıyorsa,
  // sekmeye basınca gerçekten 3 satır görünmeli.
  const kisiSuzulmus = kisiSuzgec ? olaylar.filter((o) => o.kullanici === kisiSuzgec) : olaylar;
  const turSayilari = {};
  kisiSuzulmus.forEach((o) => { turSayilari[o.tur] = (turSayilari[o.tur] || 0) + 1; });
  const turRenkleri = {};
  kisiSuzulmus.forEach((o) => { if (!turRenkleri[o.tur]) turRenkleri[o.tur] = o.renk; });
  // Sık kullanılanlar önce, sonra alfabetik: en çok bakılan tür en soldaki sekme olsun.
  const turler = Object.keys(turSayilari).sort((a, b) =>
    turSayilari[b] - turSayilari[a] || a.localeCompare(b, "tr"));

  const suzulmus = turSuzgec
    ? kisiSuzulmus.filter((o) => o.tur === turSuzgec)
    : kisiSuzulmus;
  if (olaylar.length === 0) return null;

  // Kişi başına özet: "kullanıcı bu kadar fatura kesti, bu kadar ödeme girdi".
  const ozet = {};
  suzulmus.slice(0, 200).forEach((o) => {
    // Kullanıcısı yazılmamış eski kayıt (v1.645.9 öncesi sipariş, sistem kaydı): "— — 6 satış" yerine okunur ad.
    const k = o.kullanici || "Kullanıcı yok";
    ozet[k] = ozet[k] || {};
    ozet[k][o.tur] = (ozet[k][o.tur] || 0) + 1;
  });

  const sonOlay = olaylar[0];

  return (
    <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", background: "#fff", padding: 14, marginBottom: 28 }}>
      {/* BAŞLIK AYNI ZAMANDA DÜĞME. Kapalıyken bile son işlemi özetliyor: açmadan da
          "en son ne oldu" sorusu cevaplanıyor. */}
      <button
        type="button"
        onClick={() => setAcik(!acik)}
        style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%",
          background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
        }}
      >
        <ScrollText size={15} color="var(--erp-brown)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>Son İşlemler</span>
        <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{olaylar.length} kayıt</span>
        {!acik && sonOlay && (
          <span style={{ fontSize: 11, color: "var(--erp-text-2)", display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "var(--erp-border)" }}>·</span>
            <span className="mono" style={{ fontSize: 10 }}>{sonOlay.zaman ? tarihYaz(sonOlay.zaman, true) : "—"}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: sonOlay.renk }}>{sonOlay.tur}</span>
            <span>{sonOlay.metin}</span>
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--erp-brown)", fontWeight: 600 }}>
          {acik ? "Kapat" : "Aç"}
          {acik ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {acik && (<>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
        {kisiler.length > 0 && (
          <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { setKisiSuzgec(""); setTurSuzgec(""); }}
              style={{ fontSize: 11, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                border: `1px solid ${kisiSuzgec ? "var(--erp-border)" : "var(--erp-brown)"}`,
                background: kisiSuzgec ? "#fff" : "var(--erp-brown)", color: kisiSuzgec ? "var(--erp-text-2)" : "#fff" }}
            >
              Herkes
            </button>
            {kisiler.map((k) => (
              <button
                key={k}
                type="button"
                // Kişi değişince tür süzgeci sıfırlanıyor: o kişide o tür hiç olmayabilir ve
                // ekran boş kalırdı; boş liste "veri yok" gibi okunuyordu.
                onClick={() => { setKisiSuzgec(kisiSuzgec === k ? "" : k); setTurSuzgec(""); }}
                style={{ fontSize: 11, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                  border: `1px solid ${kisiSuzgec === k ? "var(--erp-brown)" : "var(--erp-border)"}`,
                  background: kisiSuzgec === k ? "var(--erp-brown)" : "#fff", color: kisiSuzgec === k ? "#fff" : "var(--erp-text-2)" }}
              >
                {k}
              </button>
            ))}
          </span>
        )}
      </div>

      {/* TÜR SEKMELERİ */}
      {turler.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, borderBottom: "1px solid var(--erp-line-soft)", paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setTurSuzgec("")}
            style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
              border: `1px solid ${turSuzgec ? "var(--erp-border)" : "var(--erp-text)"}`,
              background: turSuzgec ? "#fff" : "var(--erp-text)",
              color: turSuzgec ? "var(--erp-text-2)" : "#fff",
            }}
          >
            Tümü ({kisiSuzulmus.length})
          </button>
          {turler.map((t) => {
            const aktif = turSuzgec === t;
            const renk = turRenkleri[t] || "var(--erp-text-2)";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTurSuzgec(aktif ? "" : t)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                  border: `1px solid ${aktif ? renk : "var(--erp-border)"}`,
                  background: aktif ? renk : "#fff",
                  color: aktif ? "#fff" : renk,
                }}
              >
                {t} ({turSayilari[t]})
              </button>
            );
          })}
        </div>
      )}

      {/* KİŞİ ÖZETİ: "kullanıcı bu kadar fatura kesti, bu kadar ödeme girdi" sorusunun cevabı. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(ozet).map(([kisi, sayilar]) => (
          <span key={kisi} style={{ fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "4px 8px" }}>
            <b style={{ color: "var(--erp-text)" }}>{kisi}</b>
            {" — "}
            {Object.entries(sayilar).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(" · ")}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {suzulmus.slice(0, limit).map((o, i) => (
          <div
            key={i}
            onClick={o.git}
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "5px 6px", borderRadius: "var(--erp-r-md)", cursor: "pointer", background: i % 2 ? "var(--erp-panel)" : "transparent" }}
          >
            <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", minWidth: 108 }}>
              {o.zaman ? tarihYaz(o.zaman, true) : "—"}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: o.renk, background: alfaEkle(o.renk, "1A"), border: `1px solid ${alfaEkle(o.renk, "44")}`, borderRadius: "var(--erp-r-pill)", padding: "1px 7px", whiteSpace: "nowrap" }}>
              {o.tur}
            </span>
            <span style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 600 }}>{o.metin}</span>
            {o.alt && <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{o.alt}</span>}
            <span style={{ fontSize: 10, color: "var(--erp-text-2)", marginLeft: "auto" }}>{o.kullanici || "—"}</span>
          </div>
        ))}
      </div>

      {suzulmus.length > limit && (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 8, padding: "5px 10px", fontSize: 12 }}
          onClick={() => setLimit(limit + 20)}
        >
          Devamı ({suzulmus.length - limit} kayıt daha)
        </button>
      )}
      </>)}
    </div>
  );
}

function AnaSayfaModule({ stok, uretim, tanimlar, cariler, siparisler, muhasebe, gorevler, aktifKullanici, onGoreveGit, onNavigate, onGoToSiparis, onGoToUretim, onGoToUrun, onGoToCari }) {

  const cariBakiye = (cari) =>
    (cari.hareketler || []).reduce((sum, h) => sum + (h.yon === "Borç" ? h.tutar : -h.tutar), 0);
  // TOPLAM ALACAK PARA BİRİMİ BAZINDA (kullanıcı, 18 Eylül: "anasayfada toplam alacak sadece TL
  // cinsinden toplanıyor, 3 para birimi var, ayrı ayrı toplanması gerek").
  //
  // `cariBakiye` yalnız TL bakiyesini veriyordu; dolar ve euro alacakları hiç görünmüyordu — kart
  // "toplam alacak" diyor ama toplamın bir kısmını gösteriyordu. Kur ile TL'ye çevirip tek sayı
  // yapmak da yanlış olurdu: kur her gün değişir, alacak dövizdir; "270.000 ₺ alacağım var"
  // demekle "3.000 $ alacağım var" demek aynı şey değil.
  const alacakPB = {};
  cariler.forEach((c) => {
    const bakiyeler = cariBakiyeleri(c);
    Object.entries(bakiyeler).forEach(([pb, tutar]) => {
      if (tutar > 0) alacakPB[pb] = (alacakPB[pb] || 0) + tutar;
    });
  });
  // TL önce, sonra tutarı büyük olan: gözün ilk gittiği yer ana para birimi olsun.
  const alacakSatirlari = Object.entries(alacakPB)
    .sort((a, b) => (a[0] === "TRY" ? -1 : b[0] === "TRY" ? 1 : b[1] - a[1]));
  const toplamAlacak = alacakPB.TRY || 0;
  // DEFTER AYRIMI (v1.543.0 — kullanıcı: "Resmi defter olmayan yer kaldı mı?" → "Diğerlerini yap"). Kart
  // ana değeri tüm defterler; altına Genel ve Resmi alacak ayrı yazılıyor (para birimi başına, cari
  // listesiyle aynı `cariBakiyeleri` kuralı — Muhasebe kaydı ikisine de girer).
  const defterAlacagi = (d) => {
    const t = {};
    cariler.forEach((c) => Object.entries(cariBakiyeleri(c, d)).forEach(([pb, x]) => { if (x > 0) t[pb] = (t[pb] || 0) + x; }));
    return Object.entries(t).sort((a, b) => (a[0] === "TRY" ? -1 : b[0] === "TRY" ? 1 : b[1] - a[1]))
      .map(([pb, x]) => `${Math.round(x).toLocaleString("tr-TR")} ${PARA_SEMBOLU[pb] || pb}`).join(" · ") || "0 ₺";
  };

  const acikSatisSiparisi = siparisler.filter((s) => s.tip === "Satış" && s.durum !== "Tamamlandı" && s.durum !== "İptal").length;
  const acikAlisSiparisi = siparisler.filter((s) => s.tip === "Alış" && s.durum !== "Tamamlandı" && s.durum !== "İptal").length;

  const bugun = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  // ANASAYFA KARTLARI (kullanıcı, 17 Eylül: "ana sayfadaki stok top., stok değeri, kayıtlı ürün,
  // kritik stok, aktif üretim gibi bilgiler şu an için gereksiz, kaldırabilirsin; bunun için özel
  // dashboard hazırlarız, tıklayınca istediğimizi versin, kullanıcı tanımlı yaparız").
  //
  // Kaldırılanlar: Toplam Stok Değeri · Kayıtlı Ürün · Kritik Stok · Aktif Üretim. Bunlar her
  // açılışta ekranı dolduruyor ama kimsenin o an sorduğu soru değildi. PARA tarafı kaldı
  // (alacak, açık sipariş): günü onlar belirliyor.
  //
  // Kullanıcı tanımlı dashboard geldiğinde bu liste oradan beslenecek.
  // KISIT (v1.689): finans bilgisi görme izni olmayan kullanıcı alacak kartını ve gösterge
  // panosunu (kasa/alacak/borç/çek) görmez — bkz. gorebilirMi (094).
  const finansGorur = gorebilirMi(tanimlar, aktifKullanici, "finansRaporlari");
  const statCards = [
    finansGorur && {
      label: "Toplam Alacak",
      // Birden çok para biriminde alacak varsa kartta hepsi görünüyor: ilki büyük, kalanlar alt
      // satırda. Tek para birimi varsa kart eskisi gibi tek satır.
      value: alacakSatirlari.length === 0
        ? "0 ₺"
        : `${Math.round(alacakSatirlari[0][1]).toLocaleString("tr-TR")} ${PARA_SEMBOLU[alacakSatirlari[0][0]] || alacakSatirlari[0][0]}`,
      alt: alacakSatirlari.length > 1
        ? alacakSatirlari.slice(1).map(([pb, t]) => `${Math.round(t).toLocaleString("tr-TR")} ${PARA_SEMBOLU[pb] || pb}`).join("  ·  ")
        : `${cariler.length} cari kayıtlı`,
      defterAlt: alacakSatirlari.length ? `Genel: ${defterAlacagi("Genel")}  ·  Resmi: ${defterAlacagi("Resmi")}` : null,
      renk: "var(--erp-info)",
    },
    { label: "Açık Siparişler", value: `${acikSatisSiparisi + acikAlisSiparisi}`, alt: `${acikSatisSiparisi} satış · ${acikAlisSiparisi} alış`, renk: "var(--erp-purple)" },
  ];


  return (
    <div>
      {/* Hero */}
      <div
        // ANA SAYFA KARŞILAMA BLOĞU — KOYU YEŞİL (kullanıcı, 7 Eylül: "logonun arka planını da değiştir,
        // mor ile uyumlu olsun; çok yer kaplıyor, onu da ufalt, ekranı kullanacağız").
        //
        // Menü ve şerit açık yeşile dönünce (7z-22) bu bant yanık turuncu kaldı ve ekranın en büyük
        // rengi olarak menüyle çatıştı. Menü paletinin KOYU ucu seçildi: aynı aile (yeşil), ama
        // menüden ayrı bir katman olduğu belli olsun diye koyu — üzerindeki krem yazı da öyle
        // korunuyor.
        //
        // YÜKSEKLİK YARIYA İNDİ: dikey iç boşluk 40/32 → 18/16, başlık 34 → 22, logo 44 → 30.
        // Bant bir kimlik göstergesi; ekranın üçte birini kaplaması işi geciktiriyordu. Açıklama
        // cümlesi tamamen kaldırıldı — uygulamayı her gün açan kişiye ne işe yaradığını anlatmak
        // ilk günden sonra gürültü.
        style={{
          background: "var(--erp-shell)", color: "var(--erp-shell-ink)", padding: "18px 32px 16px",
          position: "relative", overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, opacity: 0.5,
            backgroundImage: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          {/* TARİH BAŞLIĞIN YANINA ALINDI: kendi satırında 21 piksel yer kaplıyordu, oysa tek
              kelimelik bir bilgi. */}
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(tanimlar.firmaBilgileri || {}).logo ? (
              <img src={tanimlar.firmaBilgileri.logo} alt="Logo" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: "var(--erp-r-sm)", background: "#fff" }} />
            ) : (
              <Hammer size={22} color="var(--erp-shell-ink)" />
            )}
            {(tanimlar.firmaBilgileri || {}).unvan || "Atölye ERP"}
            <span style={{ fontFamily: "inherit", fontSize: 11, color: "var(--erp-shell-ink)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
              {bugun}
            </span>
          </h1>
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
            // Dikiş ayracı: koyu mor zemin üzerinde açık mor çizgi.
            backgroundImage: "none",
            opacity: 0.5,
          }}
        />
      </div>

      <div style={{ padding: "16px 32px 32px" }}>
        {/* AÇIK GÖREVLERİM (kullanıcı, 17 Eylül: "görev oluşturulduğunda ana sayfada yer alsın").
            Görev sohbetten atanıyordu ve yalnız Sohbet ekranında görünüyordu; kimse gün içinde
            oraya bakmıyorsa görev kayboluyordu. Anasayfada en üstte, çünkü günün ilk sorusu
            "bana ne atanmış". Yalnız BANA atanan ve kapanmamış görevler. */}
        {(() => {
          const benId = aktifKullanici ? aktifKullanici.id : null;
          const benim = (gorevler || []).filter((g) => (!benId || g.atananId === benId)
            && g.durum !== "Tamamlandı" && g.durum !== "İptal");
          if (benim.length === 0) return null;
          return (
            <div data-anasayfa-gorevler="1" style={{ background: "#fff", border: "1px solid #6B4E8A", borderRadius: "var(--erp-r-lg)", marginBottom: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#6B4E8A14" }}>
                <ClipboardList size={16} color="var(--erp-purple)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", flex: 1 }}>Açık görevlerim</span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-purple)" }}>{benim.length}</span>
              </div>
              <div style={{ display: "grid" }}>
                {benim.slice(0, 6).map((g) => (
                  <button key={g.id} type="button" data-anasayfa-gorev={g.id}
                    onClick={() => onGoreveGit && onGoreveGit(g)}
                    style={{ display: "flex", gap: 10, alignItems: "center", border: "none", borderTop: "1px solid var(--erp-head)",
                      background: "none", cursor: "pointer", padding: "9px 16px", textAlign: "left", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--erp-text)", flex: 1, minWidth: 140 }}>{g.metin}</span>
                    {g.sonTarih && (
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-warn)" }}>{tarihYaz(g.sonTarih)}</span>
                    )}
                    <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-pill)", padding: "2px 8px" }}>
                      {g.durum || "Açık"}
                    </span>
                  </button>
                ))}
              </div>
              {benim.length > 6 && (
                <button type="button" onClick={() => onNavigate("gorevler")}
                  style={{ width: "100%", border: "none", borderTop: "1px solid var(--erp-head)", background: "var(--erp-panel)",
                    cursor: "pointer", padding: "7px 16px", fontSize: 12, color: "var(--erp-purple)", fontWeight: 700 }}>
                  {benim.length - 6} görev daha — hepsini aç
                </button>
              )}
            </div>
          );
        })()}
        {/* İstatistik kartları */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          {statCards.filter(Boolean).map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 16,
                borderTop: `3px solid ${s.renk}`,
              }}
            >
              <div style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {s.label}
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--erp-text)", marginTop: 4 }}>
                {s.value}
              </div>
              {s.alt && <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 2 }}>{s.alt}</div>}
              {s.defterAlt && <div data-anasayfa-defter-alacak="1" className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 2 }}>{s.defterAlt}</div>}
            </div>
          ))}
        </div>

        <GecikenIslerPaneli
          siparisler={siparisler}
          uretim={uretim}
          stok={stok}
          cariler={cariler}
          muhasebe={muhasebe}
          onGoToSiparis={onGoToSiparis}
          onGoToUretim={onGoToUretim}
          onGoToUrun={onGoToUrun}
        />

        <SonIslemlerPaneli
          muhasebe={muhasebe} onNavigate={onNavigate}
          cariler={cariler}
          stok={stok}
          siparisler={siparisler}
          onGoToCari={onGoToCari}
          onGoToSiparis={onGoToSiparis}
          onGoToUrun={onGoToUrun}
        />

        {/* GÖSTERGE PANOSU (v1.645.13): modül kartları yerine — bkz. AnasayfaGostergesi. */}
        {finansGorur && <AnasayfaGostergesi cariler={cariler} siparisler={siparisler} uretim={uretim} muhasebe={muhasebe}
          onNavigate={onNavigate} onGoToSiparis={onGoToSiparis} onGoToUretim={onGoToUretim} />}
      </div>
    </div>
  );
}

// ANASAYFA GÖSTERGE PANOSU (v1.645.13 — kullanıcı, anasayfa görüntüsüyle: "Modülleri kaldırabiliriz, oraya dashboard
// yaparız"). Modül kartları (Tanımlar / Stok / Üretim / Cari / Sipariş — üst menünün tekrarı, sayaçları bilgi vermiyordu)
// kalktı; yerine günü belirleyen sorular: kasada ne var, bu ay ne girdi-çıktı, kime borçluyuz, hangi çek dönüyor, hangi
// sipariş teslime yaklaştı, üretim nerede bekliyor. Her kart ilgili ekranı açar. Kaynak yalnız mevcut kayıtlar (hesap
// hareketleri, cari para hareketleri, çek defteri, siparişler, üretim ilerlemesi) — ayrı bir pano verisi tutulmaz.
// Para birimleri TOPLANMAZ (kur çevrimi yapılmamış bir toplam olurdu): her birim ayrı satır.
function AnasayfaGostergesi({ cariler, siparisler, uretim, muhasebe, onNavigate, onGoToSiparis, onGoToUretim }) {
  const bugunG = bugunYerel();
  const ayAnahtari = bugunG.slice(0, 7);
  const gecenAy = (() => { const d = new Date(`${bugunG.slice(0, 7)}-15T12:00:00`); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const tutar = (x, pb) => `${Math.round(x || 0).toLocaleString("tr-TR")} ${PARA_SEMBOLU[pb] || pb}`;
  const pbSirala = (o) => Object.entries(o).filter(([, t]) => Math.abs(t) > 0.004).sort((a, b) => (a[0] === "TRY" ? -1 : b[0] === "TRY" ? 1 : Math.abs(b[1]) - Math.abs(a[1])));
  // (1) Kasa & banka.
  const hesaplar = [
    ...(((muhasebe && muhasebe.kasalar) || []).filter((h) => !h.pasif).map((h) => ({ tur: "Kasa", h }))),
    ...(((muhasebe && muhasebe.bankalar) || []).filter((h) => !h.pasif).map((h) => ({ tur: "Banka", h }))),
  ];
  const nakit = {};
  hesaplar.forEach(({ h }) => { const pb = h.paraBirimi || "TRY"; nakit[pb] = (nakit[pb] || 0) + hesapBakiyesi(h); });
  // (2) Bu ay / geçen ay tahsilat - ödeme.
  const ay = { [ayAnahtari]: { Tahsilat: {}, "Ödeme": {} }, [gecenAy]: { Tahsilat: {}, "Ödeme": {} } };
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!paraHareketiMi(h)) return;
    const a = ay[String(h.tarih || "").slice(0, 7)];
    if (!a) return;
    const tip = odemeHareketTipi(h); const pb = h.paraBirimi || c.paraBirimi || "TRY";
    a[tip][pb] = (a[tip][pb] || 0) + (Number(h.tutar) || 0);
  }));
  // (3) Borç (bakiyesi eksi cariler).
  const borc = {}; let borcluSayisi = 0;
  (cariler || []).forEach((c) => {
    let var_ = false;
    Object.entries(cariBakiyeleri(c)).forEach(([pb, t]) => { if (t < -0.004) { borc[pb] = (borc[pb] || 0) - t; var_ = true; } });
    if (var_) borcluSayisi++;
  });
  // (4) Çek / senet portföyü + en yakın vade.
  const portfoy = ((muhasebe && muhasebe.cekler) || []).filter((c) => (c.durum || "Portföyde") === "Portföyde");
  const portfoyToplam = {};
  portfoy.forEach((c) => { const pb = c.paraBirimi || "TRY"; portfoyToplam[pb] = (portfoyToplam[pb] || 0) + (Number(c.tutar) || 0); });
  const enYakinVade = portfoy.map((c) => String(c.vadeTarihi || "").slice(0, 10)).filter(Boolean).sort()[0];
  // (5) Yaklaşan teslimler: açık satış siparişleri, teslim tarihine göre.
  const teslimler = (siparisler || [])
    .filter((s) => s.tip === "Satış" && s.durum !== "Tamamlandı" && s.durum !== "İptal")
    .map((s) => ({ s, kalan: (s.kalemler || []).reduce((t, k) => t + Math.max(0, (k.miktar || 0) - (k.karsilanan || 0)), 0) }))
    .filter((x) => x.kalan > 0)
    .sort((a, b) => String(a.s.teslimTarihi || "9999").localeCompare(String(b.s.teslimTarihi || "9999")));
  // (6) Üretim: aktif üretimlerde aşama başına bekleyen adet.
  const aktifUretimler = (uretim || []).filter((o) => o.asama !== "Tamamlandı" && !o.stogaEklendiMi);
  const asamalar = {};
  aktifUretimler.forEach((o) => {
    try { uretimAsamaDagilimi(o).forEach((r) => { if (/Üretildi|Hurda/.test(r.asama)) return; asamalar[r.asama] = (asamalar[r.asama] || 0) + r.miktar; }); } catch (e) { /* eksik kayıt: atla */ }
  });
  const asamaListesi = Object.entries(asamalar).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const asamaMax = Math.max(1, ...asamaListesi.map(([, m]) => m));
  const cariAd = (id) => ((cariler || []).find((c) => c.id === id) || {}).unvan || "";

  const kart = (anahtar, baslik, renk, git, icerik) => (
    <button key={anahtar} type="button" data-gosterge={anahtar} onClick={git}
      style={{ textAlign: "left", cursor: "pointer", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderTop: `3px solid ${renk}`,
        borderRadius: "var(--erp-r-lg)", padding: 14, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 6 }}>
        {baslik}<ArrowRight size={12} style={{ marginLeft: "auto" }} />
      </div>
      {icerik}
    </button>
  );
  const buyuk = (s, renk) => <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: renk || "var(--erp-text)", lineHeight: 1.2 }}>{s}</div>;
  const kucuk = (s) => <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{s}</div>;
  const satirlar = (o, renk) => { const l = pbSirala(o); return l.length ? l.map(([pb, t], i) => <React.Fragment key={pb}>{i === 0 ? buyuk(tutar(t, pb), renk) : kucuk(tutar(t, pb))}</React.Fragment>) : buyuk("0 ₺", renk); };
  const ayOzeti = (a) => pbSirala(Object.fromEntries([...new Set([...Object.keys(a.Tahsilat), ...Object.keys(a["Ödeme"])])].map((pb) => [pb, 1])))
    .map(([pb]) => `${tutar(a.Tahsilat[pb] || 0, pb)} / ${tutar(a["Ödeme"][pb] || 0, pb)}`).join(" · ");
  const panel = { background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 14, minWidth: 0 };

  return (
    <div data-anasayfa-gosterge="1" style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>Gösterge</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        {kart("nakit", `Kasa & Banka · ${hesaplar.length} hesap`, "#2F6B4F", () => onNavigate("muhasebe"), satirlar(nakit, "#2F6B4F"))}
        {/* AY BAŞI MUTABAKAT HATIRLATMASI (v1.673.0, 263): geçen ayın mektubu gitmemiş bakiyeli cari varsa. */}
        {(() => { const n = mutabakatHatirlatmaSayisi(cariler); return n > 0 && kart("mutabakat", `${mutabakatDonemAdi(mutabakatVarsayilanDonem())} mutabakatı`, "#B8860B", () => onNavigate("mutabakat"),
          (<><div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "#B8860B" }}>{n} cari</div><div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>mektuplar hazır — gönder</div></>)); })()}
        {kart("buay", "Bu ay tahsilat / ödeme", "var(--erp-primary)", () => onNavigate("odemerapor"), (<>
          {(() => { const a = ay[ayAnahtari]; const pbs = pbSirala(Object.fromEntries([...new Set([...Object.keys(a.Tahsilat), ...Object.keys(a["Ödeme"]), "TRY"])].map((pb) => [pb, 1])));
            const ana = (pbs[0] || ["TRY"])[0];
            return (<>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                <span style={{ color: HAREKET_TIPI_RENK["Tahsilat"] }}>+{tutar(a.Tahsilat[ana] || 0, ana)}</span>{"  "}
                <span style={{ color: HAREKET_TIPI_RENK["Ödeme"] }}>−{tutar(a["Ödeme"][ana] || 0, ana)}</span>
              </div>
              {pbs.slice(1).map(([pb]) => <React.Fragment key={pb}>{kucuk(`${pb}: +${tutar(a.Tahsilat[pb] || 0, pb)} −${tutar(a["Ödeme"][pb] || 0, pb)}`)}</React.Fragment>)}
            </>);
          })()}
          {kucuk(`Geçen ay: ${ayOzeti(ay[gecenAy]) || "kayıt yok"}`)}
        </>))}
        {kart("borc", `Toplam borç · ${borcluSayisi} cari`, "var(--erp-warn)", () => onNavigate("cari"), satirlar(borc, "var(--erp-warn)"))}
        {kart("cek", `Portföyde çek / senet · ${portfoy.length}`, "var(--erp-text-2)", () => onNavigate("cekler"), (<>
          {satirlar(portfoyToplam)}
          {enYakinVade && kucuk(`En yakın vade: ${tarihTr(enYakinVade)}${enYakinVade < bugunG ? " (geçti)" : ""}`)}
        </>))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div data-gosterge="teslimler" style={panel}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Truck size={15} color="var(--erp-info)" /><b style={{ fontSize: 13 }}>Yaklaşan teslimler</b>
            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{teslimler.length} açık satış</span>
            <button type="button" className="btn-ghost" onClick={() => onNavigate("siparis")} style={{ marginLeft: "auto", padding: "2px 8px", fontSize: 11 }}>Siparişler</button>
          </div>
          {teslimler.length === 0 ? kucuk("Teslim bekleyen sipariş yok.") : teslimler.slice(0, 6).map(({ s, kalan }) => {
            const t = String(s.teslimTarihi || "").slice(0, 10);
            const gecti = t && t < bugunG;
            return (
              <div key={s.id} role="button" data-gosterge-teslim={s.siparisNo} onClick={() => onGoToSiparis && onGoToSiparis(s.id)}
                style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 2px", borderTop: "1px solid var(--erp-line-soft)", cursor: "pointer", fontSize: 12 }}>
                <span className="mono" style={{ minWidth: 78, color: gecti ? "var(--erp-danger, #B3261E)" : "var(--erp-text-2)", fontWeight: gecti ? 700 : 400 }}>{t ? tarihTr(t) : "tarihsiz"}</span>
                <b className="mono">{s.siparisNo}</b>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--erp-text-2)" }}>{cariAd(s.cariId)}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{Math.round(kalan * 100) / 100} kalan</span>
              </div>
            );
          })}
        </div>
        <div data-gosterge="uretim" style={panel}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Hammer size={15} color="var(--erp-primary)" /><b style={{ fontSize: 13 }}>Üretim nerede bekliyor</b>
            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{aktifUretimler.length} aktif üretim</span>
            <button type="button" className="btn-ghost" onClick={() => onGoToUretim && onGoToUretim(null)} style={{ marginLeft: "auto", padding: "2px 8px", fontSize: 11 }}>Üretim</button>
          </div>
          {asamaListesi.length === 0 ? kucuk("Aktif üretim yok.") : asamaListesi.map(([asama, m]) => (
            <div key={asama} data-gosterge-asama={asama} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 40%) 1fr auto", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 12 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asama}</span>
              <span style={{ height: 8, borderRadius: 4, background: "var(--erp-line-soft)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.max(4, (m / asamaMax) * 100)}%`, background: prosesRengi(asama.replace(/ (bekliyor|da|de|ta|te)$/, "")) || "var(--erp-primary)" }} />
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>{Math.round(m * 100) / 100}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= ORTAK: STOĞA AİT RENK GÖRSELİ (URL tabanlı) =================
   Not: Görsel rengin kendisine değil, o ürünün/stoğun ilgili renk satırına aittir.
