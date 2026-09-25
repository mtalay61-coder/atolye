// Kasa ve Banka için ortak liste/hareket bileşeni — ikisi de aynı yapıyı (hesap + giriş/çıkış
// hareketleri, türetilmiş bakiye) paylaştığı için tek bir bileşende birleştirilmiştir.
function HesapListesi({ onHesapGuncelle, giderKartlari, tumHesaplar, onVirman, onHareketGuncelle, hesaplar, birimAdi, ekleAlanlari, onHesapEkle, onHesapSil, onHesapPasifDegistir, onHareketEkle, onHareketSil, cariler, kurlar, showToast, silmeYetkisiVar }) {
  // Düzenlenen hesabın kimliği ve form içeriği (19 Eylül).
  const [duzenlenen, setDuzenlenen] = useState(null);
  const [duzenForm, setDuzenForm] = useState({});
  const [yeniForm, setYeniForm] = useState({ paraBirimi: "TRY" });
  const [showYeni, setShowYeni] = useState(false);
  const [acikHesap, setAcikHesap] = useState(null);
  // İŞLEM PANELİ (kullanıcı, 17 Eylül: "kasa seçildiğinde ilk olarak hareketleri getirsin;
  // hareketlerin üzerinde ödeme, tahsilat, kasalar arası virman yapabileceğimiz işlemler butonu
  // olsun, tıklayınca güzel butonları olsun, oralardan işlem yapalım").
  //
  // Eskiden hesap açılınca EKRANIN ÜSTÜNÜ form kaplıyordu; hareketleri görmek için aşağı kaymak
  // gerekiyordu. Artık önce hareketler geliyor, form ancak bir işlem seçilince açılıyor.
  // null | "tahsilat" | "odeme" | "virman" | "serbest"
  const [islem, setIslem] = useState(null);
  const [virman, setVirman] = useState({ hedef: "", tutar: "", aciklama: "" });
  // Satır içi düzenleme: { hesapId, hareketId, tutar, tarih, aciklama } | null
  const [duzenle, setDuzenle] = useState(null);
  // Daha önce kullanılmış virman sebepleri + hazır öneriler. Sıra: en son kullanılan önce.
  const virmanSebepOnerileri = (() => {
    const gorulen = [];
    (tumHesaplar || []).forEach((hsp) => {
      (hsp.hareketler || []).forEach((hr) => {
        const x = String(hr.virmanSebebi || "").trim();
        if (x && !gorulen.includes(x)) gorulen.push(x);
      });
    });
    VIRMAN_SEBEPLERI.forEach((x) => { if (!gorulen.includes(x)) gorulen.push(x); });
    return gorulen;
  })();
  const [pbSekme, setPbSekme] = useState("Tümü"); // "Tümü" | "TRY" | "USD" | "EUR" — hesap listesini para birimine göre filtreler
  const [defterFiltre, setDefterFiltre] = useState("Tümü"); // "Tümü" | "Genel" | "Resmi"
  // Sütun bazlı filtre — cari ekstresindeki ile aynı kalıp.
  const [kolonFiltre, setKolonFiltre] = useState({ tarih: "", aciklama: "", giris: "", cikis: "" });
  const kolonFiltreAktif = Object.values(kolonFiltre).some((v) => String(v).trim() !== "");
  // donusturulecekPB: Kasa/banka bakiyesi HER ZAMAN kendi para biriminde (P.Birimi) çevrimsiz değişir.
  // Bu alan SADECE, hareket bir cariye bağlıysa, o cariye HANGİ para biriminde işleneceğini belirler —
  // varsayılan olarak hesabınkiyle aynıdır (dönüşüm yok, cari de aynı tutarı aynı para biriminde alır).
  const [hForm, setHForm] = useState({ yon: "Giriş", tutar: "", aciklama: "", cariId: "", defter: "Genel", donusturulecekPB: null, kur: "", hedefTutar: "" });

  function yeniKaydet() {
    if (!yeniForm.ad || !yeniForm.ad.trim()) return;
    onHesapEkle({ paraBirimi: "TRY", ...yeniForm });
    setYeniForm({ paraBirimi: "TRY" });
    setShowYeni(false);
  }

  function hareketiKaydet(hesapId, hesapPB) {
    const tutar = parseFloat(hForm.tutar);
    if (!tutar || tutar <= 0) return;
    // Kasa/banka bakiyesi HER ZAMAN bu tutarı, hesabın KENDİ para biriminde, ÇEVRİMSİZ alır — "P.Birimi"
    // zaten hesabın kendisine kilitli olduğu için burada dönüşüme gerek yoktur.
    // "Dönüştürülecek P.Birimi" ve "Kur" İSE SADECE, bir cari seçiliyse, o cariye HANGİ para biriminde
    // ve NE KADAR işleneceğini belirler (kasa tutarından bağımsız, ayrı bir hesap).
    const donusturulecekPB = hForm.donusturulecekPB || hesapPB;
    let cariTutar = tutar;
    let aciklamaEk = "";
    if (hForm.cariId && donusturulecekPB !== hesapPB) {
      // Kullanıcı Kur kutusuna hiç dokunmadıysa, kutuda GÖRÜNEN öneri (aynı hesaplama render'da da
      // yapılıyor) kullanılır — sadece kullanıcı gerçekten BOŞ bırakıp öneri de yoksa kayıt reddedilir.
      // Kur yönü TEK YERDEN (`kurSorusu`): burada ve ekranda ayrı ayrı hesaplansaydı, biri
      // düzeltilip diğeri unutulduğunda tutar sessizce yanlış yazılırdı.
      const soru = kurSorusu(hesapPB, donusturulecekPB, kurlar);
      const kur = hForm.kur !== "" ? parseFloat(hForm.kur) : (soru && soru.onerilen);
      if (!kur || kur <= 0) {
        showToast(`⚠ "1 ${soru ? soru.a : hesapPB} = ? ${soru ? soru.b : donusturulecekPB}" kurunu girin — cariye işlenecek tutar hesaplanamadı`);
        return;
      }
      cariTutar = kurUygula(tutar, kur, soru.bolme);
      aciklamaEk = ` (${tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[hesapPB] || hesapPB}, 1 ${soru.a} = ${kur} ${soru.b} kuruyla)`;
    }
    // KARŞI TARAF ZORUNLU (17 Eylül): cari ya da gider/gelir kartı. Karşılıksız para hareketi
    // kasayı gerçekten değiştirip hiçbir yere yazılmamak demekti; kârlılık da hesaplanamıyordu.
    if (!hForm.cariId && !hForm.giderKartId) {
      showToast((giderKartlari || []).length === 0
        ? "Karşı taraf gerekli: cari seçin ya da Tanımlar'dan gider/gelir kartı açın"
        : "Karşı taraf gerekli: cari ya da gider/gelir kartı seçin");
      return;
    }
    const kart = (giderKartlari || []).find((k) => k.id === hForm.giderKartId) || null;
    onHareketEkle(hesapId, {
      giderKartId: kart ? kart.id : null,
      giderKartAd: kart ? kart.ad : null,
      giderGrubu: kart ? kart.grup : null,
      yon: hForm.yon, tutar,
      aciklama: (hForm.aciklama || "") + (hForm.cariId ? aciklamaEk : ""),
      cariId: hForm.cariId || null, defter: hForm.defter || "Genel",
      cariTutar, cariPB: donusturulecekPB,
    });
    setHForm({ yon: "Giriş", tutar: "", aciklama: "", cariId: "", giderKartId: "", defter: "Genel", donusturulecekPB: null, kur: "", hedefTutar: "" });
  }

  // Farklı para birimlerindeki bakiyeleri TOPLAMAK anlamsız olduğu için (1 USD ≠ 1 ₺), genel toplam
  // TEK bir sayı yerine, her para birimi için AYRI AYRI gösterilir.
  const paraBirimiToplamlari = {};
  hesaplar.forEach((h) => {
    const pb = h.paraBirimi || "TRY";
    paraBirimiToplamlari[pb] = (paraBirimiToplamlari[pb] || 0) + hesapBakiyesi(h);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.keys(paraBirimiToplamlari).length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--erp-text-2)" }}>Toplam {birimAdi.toLocaleLowerCase("tr-TR")} bakiyesi: <span className="mono" style={{ fontWeight: 700 }}>0 ₺</span></span>
          ) : (
            Object.entries(paraBirimiToplamlari).map(([pb, toplam]) => (
              <span key={pb} style={{ fontSize: 13, color: "var(--erp-text-2)" }}>
                {pb}:{" "}
                <span className="mono" style={{ fontWeight: 700, color: toplam >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                  {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pb] || pb}
                </span>
              </span>
            ))
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowYeni((v) => !v)}>
          <Plus size={14} /> Yeni {birimAdi}
        </button>
      </div>

      {showYeni && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {ekleAlanlari.map((a) => (
            <label key={a.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              {a.label}
              {/* ÖĞRENEN ALAN (kullanıcı, 19 Eylül: "daha önce girilen bankaları hatırlasın,
                  seçmeli olsun"). Banka adı gibi tekrar eden alanlar her hesapta yeniden
                  yazılıyordu; aynı banka "Ziraat", "Ziraat Bankası", "ziraat bankasi" diye üç
                  farklı yazımla kaydedilebiliyordu. Öneriler AYRI BİR LİSTEDE TUTULMUYOR —
                  var olan hesaplardan toplanıyor, tıpkı virman sebebinde olduğu gibi. */}
              <input
                value={yeniForm[a.key] || ""}
                data-hesap-alan={a.key}
                list={`hesap-oneri-${a.key}`}
                onChange={(e) => setYeniForm({ ...yeniForm, [a.key]: e.target.value })}
                placeholder={a.placeholder}
                style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 13 }}
              />
              <datalist id={`hesap-oneri-${a.key}`}>
                {[...new Set((tumHesaplar || hesaplar || []).map((h) => String(h[a.key] || "").trim()).filter(Boolean))]
                  .map((v) => <option key={v} value={v} />)}
              </datalist>
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Para Birimi
            <select
              value={yeniForm.paraBirimi || "TRY"}
              onChange={(e) => setYeniForm({ ...yeniForm, paraBirimi: e.target.value })}
              style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 13 }}
            >
              {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
            </select>
          </label>
          <button className="btn-primary btn-save" onClick={yeniKaydet}><Save size={14} /> Kaydet</button>
          <button className="btn-ghost" onClick={() => { setShowYeni(false); setYeniForm({ paraBirimi: "TRY" }); }}>Vazgeç</button>
        </div>
      )}

      {(() => {
        // Hesaplarda GEÇEN her para birimi için bir sekme gösterilir — sadece bir tanesi varsa (örn.
        // hep TRY), sekme çubuğu gösterilmez, çünkü seçecek bir şey yoktur.
        const mevcutPBler = Array.from(new Set(hesaplar.map((h) => h.paraBirimi || "TRY")));
        if (mevcutPBler.length <= 1) return null;
        return (
          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
            {["Tümü", ...mevcutPBler].map((pbSek) => {
              const sayi = pbSek === "Tümü" ? hesaplar.length : hesaplar.filter((h) => (h.paraBirimi || "TRY") === pbSek).length;
              const aktif = pbSekme === pbSek;
              return (
                <button
                  key={pbSek}
                  type="button"
                  onClick={() => setPbSekme(pbSek)}
                  style={{
                    padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${aktif ? MUHASEBE_RENK : "var(--erp-border)"}`,
                    background: aktif ? alfaEkle(MUHASEBE_RENK, "1A") : "#fff",
                    color: aktif ? MUHASEBE_RENK : "var(--erp-text-2)",
                  }}
                >
                  {pbSek} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {(() => {
        // Pasif hesaplar listenin SONUNDA, soluk gösterilir. Ayrı bir sekmeye taşımak yerine burada
        // tutuluyor çünkü kasa/banka sayısı azdır ve bakiyelerini görmek çoğu zaman hâlâ gerekir.
        const pbUygun = pbSekme === "Tümü" ? hesaplar : hesaplar.filter((h) => (h.paraBirimi || "TRY") === pbSekme);
        const gorunenHesaplar = [...pbUygun.filter((h) => !h.pasif), ...pbUygun.filter((h) => h.pasif)];
        if (gorunenHesaplar.length === 0) {
          return <EmptyState text={hesaplar.length === 0 ? `Henüz tanımlı ${birimAdi.toLocaleLowerCase("tr-TR")} yok.` : `${pbSekme} para biriminde ${birimAdi.toLocaleLowerCase("tr-TR")} yok.`} />;
        }
        // ---- USTA/DETAY (master-detail) DÜZENİ ----
        // Önceki düzende her hesap bir akordeon karttı: hesabı açmak listeyi aşağı itiyor, ikinci bir
        // hesaba bakmak için öncekini kapatmak gerekiyordu. Muhasebe ekranlarında asıl iş "listede
        // gez, seçilende çalış" olduğu için liste SOLDA sabit kalır, seçilen hesabın hareket ve
        // formu SAĞDA açılır. Liste kendi içinde kayar; altındaki dipnot satırı para birimi bazlı
        // toplamı ekrandan hiç kaybettirmez.
        const seciliHesap = gorunenHesaplar.find((h) => h.id === acikHesap) || null;
        // Dipnot toplamları GÖRÜNEN (filtrelenmiş) hesaplara göre hesaplanır — üstteki genel toplam
        // tüm hesapları kapsar; ikisi bilerek farklıdır, çünkü kullanıcı bir para birimi sekmesi
        // seçtiğinde "şu an baktığım listenin toplamı" bilgisini bekler.
        const gorunenPBToplamlari = {};
        gorunenHesaplar.forEach((h) => {
          const pbx = h.paraBirimi || "TRY";
          gorunenPBToplamlari[pbx] = (gorunenPBToplamlari[pbx] || 0) + hesapBakiyesi(h);
        });

        return (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* ---------- SOL PANEL: hesap listesi ---------- */}
          <div style={{ width: 300, minWidth: 260, flexShrink: 0, background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: "1px solid #E4D8C0", background: "var(--erp-panel)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", flex: 1 }}>{birimAdi} Listesi</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{gorunenHesaplar.length} kayıt</span>
            </div>

            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {gorunenHesaplar.map((h) => {
                const bakiye = hesapBakiyesi(h);
                const pb = h.paraBirimi || "TRY";
                const sembol = PARA_SEMBOLU[pb] || pb;
                const secili = acikHesap === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    data-hesap-satir={h.id}
                    onClick={() => setAcikHesap(secili ? null : h.id)}
                    title={[h.ad, h.banka, h.iban].filter(Boolean).join(" · ")}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: secili ? alfaEkle(MUHASEBE_RENK, "14") : "transparent",
                      borderLeft: `3px solid ${secili ? MUHASEBE_RENK : "transparent"}`,
                      borderTop: "none", borderRight: "none", borderBottom: "1px solid #F2E8D8",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Hesap adı KIRPILMAZ: iki satıra sarar. Kırpılan adlar ("ARİF ULUĞ …" gibi)
                          birbirinden ayırt edilemez hale gelir — bir muhasebe listesinde bu ciddi bir kusurdur. */}
                      <div style={{ fontSize: 12, fontWeight: secili ? 700 : 600, color: h.pasif ? "var(--erp-text-3)" : "var(--erp-text)", lineHeight: 1.3, overflowWrap: "anywhere" }}>
                        {h.ad}
                        {h.pasif && (
                          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 5px", borderRadius: "var(--erp-r-pill)", marginLeft: 5 }}>pasif</span>
                        )}
                      </div>
                      {(h.banka || h.iban) && (
                        <div className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[h.banka, h.iban].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: bakiye === 0 ? "var(--erp-border)" : bakiye > 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                        {bakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>{sembol}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ---- DİPNOT TOPLAM SATIRI ----
                Liste ne kadar uzun olursa olsun kaydırmadan etkilenmez; her para birimi ayrı satırdır
                (farklı para birimlerini toplamak anlamsız olurdu). */}
            <div style={{ borderTop: "2px solid #E4D8C0", background: "var(--erp-panel)", padding: "6px 10px" }}>
              {Object.keys(gorunenPBToplamlari).length === 0 ? (
                <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>—</span>
              ) : (
                Object.entries(gorunenPBToplamlari).map(([pbx, tp]) => (
                  <div key={pbx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)" }}>Toplam {pbx}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: tp >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                      {tp.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pbx] || pbx}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ---------- SAĞ PANEL: seçili hesabın detayı ---------- */}
          <div style={{ flex: 1, minWidth: 320 }}>
            {!seciliHesap && (
              <EmptyState text={`Soldan bir ${birimAdi.toLocaleLowerCase("tr-TR")} seçin — hareketleri, bakiyesi ve hareket girişi burada açılır.`} />
            )}
            {gorunenHesaplar.filter((h) => h.id === acikHesap).map((h) => {
              const bakiye = hesapBakiyesi(h);
              const genelBakiye = hesapBakiyesi(h, "Genel");
              const resmiBakiye = hesapBakiyesi(h, "Resmi");
              const pb = h.paraBirimi || "TRY";
              const sembol = PARA_SEMBOLU[pb] || pb;
              // Sağ panelde detay HER ZAMAN açıktır (seçim zaten "açmak" demektir) — aşağıdaki
              // gövde, akordeon sürümünden DEĞİŞTİRİLMEDEN devralındığı için bu bayrak korunur.
              const acik = true;
              return (
                <div key={h.id} style={{ background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: "1px solid #E4D8C0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" }}>
                        {h.ad}
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)", background: "var(--erp-border-2)", padding: "1px 6px", borderRadius: "var(--erp-r-pill)", marginLeft: 6 }}>
                          {pb}
                        </span>
                      </div>
                      {(h.banka || h.iban) && (
                        <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{[h.banka, h.iban].filter(Boolean).join(" · ")}</div>
                      )}
                      <div className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 2 }}>
                        Genel: {genelBakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol} · Resmi: {resmiBakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}
                      </div>
                    </div>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: bakiye >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                      {bakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAcikHesap(null)}
                      title="Seçimi kaldır"
                      style={{ border: "1px solid #E4D8C0", background: "#fff", borderRadius: "var(--erp-r-md)", padding: "4px 6px", cursor: "pointer", color: "var(--erp-text-2)", display: "flex", flexShrink: 0 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                {/* İŞLEM ÇUBUĞU: hesap açılınca görünen ilk şey. Form seçilen işleme göre açılıyor. */}
                {acik && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 12px 0" }}>
                    {[
                      { k: "tahsilat", ad: "Tahsilat", ipucu: "Cariden para girdi", renk: "var(--erp-primary)" },
                      { k: "odeme", ad: "Ödeme", ipucu: "Cariye para çıktı", renk: "var(--erp-warn)" },
                      { k: "virman", ad: "Virman", ipucu: "Kasalar/bankalar arası aktarım", renk: "var(--erp-info)" },
                      { k: "serbest", ad: "Serbest kayıt", ipucu: "Cariye bağlı olmayan giriş/çıkış", renk: "var(--erp-text-2)" },
                    ].map((x) => (
                      <button
                      key={x.k} type="button" data-islem={x.k} title={x.ipucu}
                        onClick={() => {
                          setIslem(islem === x.k ? null : x.k);
                          // Yön işleme göre kilitleniyor: kullanıcı ayrıca "Giriş/Çıkış" seçmesin.
                          if (x.k === "tahsilat") setHForm((f) => ({ ...f, yon: "Giriş" }));
                          if (x.k === "odeme") setHForm((f) => ({ ...f, yon: "Çıkış" }));
                        }}
                        style={{ padding: "8px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${islem === x.k ? x.renk : "var(--erp-border)"}`,
                          background: islem === x.k ? `${x.renk}1A` : "#fff",
                          color: islem === x.k ? x.renk : "var(--erp-text)" }}>
                        {x.ad}
                      </button>
                    ))}
                  </div>
                )}

                {acik && islem === "virman" && (
                  <div data-virman-formu="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", padding: "10px 12px" }}>
                    {/* VİRMAN: bu hesaptan ÇIKIŞ, hedef hesaba GİRİŞ — tek işlem, iki kayıt, aynı
                        bağ kimliği. Cari yok: para şirket içinde yer değiştiriyor. Para birimi
                        farklıysa hedefe yazılacak tutar ayrıca soruluyor (kur burada tahmin
                        edilmiyor; gerçekte kaç para geçtiğini kullanıcı bilir). */}
                    <Field label="Nereye">
                      <select value={virman.hedef} data-virman-hedef="1" onChange={(e) => setVirman({ ...virman, hedef: e.target.value })} style={inputStyle}>
                        <option value="">Seçin…</option>
                        {(tumHesaplar || []).filter((x) => x.id !== h.id).map((x) => (
                          <option key={x.id} value={x.id}>{x.ad} ({x.paraBirimi || "TRY"})</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={`Tutar (${sembol})`}>
                      <input type="number" min="0" step="any" value={virman.tutar} data-virman-tutar="1"
                        onChange={(e) => setVirman({ ...virman, tutar: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                    </Field>
                    {(() => {
                      const hedefHesap = (tumHesaplar || []).find((x) => x.id === virman.hedef);
                      const hedefPB = hedefHesap ? (hedefHesap.paraBirimi || "TRY") : pb;
                      if (!hedefHesap || hedefPB === pb) return null;
                      // KUR ÇEVİRİCİ (kullanıcı, 17 Eylül: "virmanda kur çevirmek için kur
                      // çeviricimiz vardı, onu kullanalım"). Cari ödeme/tahsilatındaki ile AYNI
                      // yardımcılar: `kurSorusu` yönü ve öneriyi verir, `kurUygula` uygular.
                      // Kur yazınca hedef tutar, hedef tutar yazınca kur hesaplanıyor — iki kutu
                      // birbirini besliyor; kullanıcı hangisini biliyorsa onu giriyor.
                      const soru = kurSorusu(pb, hedefPB, kurlar);
                      const girilen = parseFloat(virman.tutar) || 0;
                      const kurDeger = virman.kur !== undefined && virman.kur !== ""
                        ? virman.kur
                        : (soru && soru.onerilen != null ? String(soru.onerilen) : "");
                      return (
                        <>
                          <Field label={soru ? `Kur (1 ${soru.a} = ? ${soru.b})` : "Kur"}>
                            <input type="number" min="0" step="any" value={kurDeger} data-virman-kur="1"
                              onChange={(e) => {
                                const k = e.target.value;
                                const sayi = parseFloat(k);
                                setVirman({
                                  ...virman, kur: k,
                                  hedefTutar: (girilen > 0 && sayi > 0) ? String(kurUygula(girilen, sayi, soru.bolme)) : virman.hedefTutar,
                                });
                              }}
                              style={{ ...inputStyle, width: 110 }} />
                          </Field>
                          <Field label={`Hedefe geçen (${hedefPB})`}>
                            <input type="number" min="0" step="any"
                              value={virman.hedefTutar !== undefined && virman.hedefTutar !== ""
                                ? virman.hedefTutar
                                : ((girilen > 0 && parseFloat(kurDeger) > 0) ? String(kurUygula(girilen, parseFloat(kurDeger), soru.bolme)) : "")}
                              data-virman-hedef-tutar="1"
                              onChange={(e) => {
                                const h2 = e.target.value;
                                const sayi = parseFloat(h2);
                                // Hedef tutardan kuru geri hesapla: kullanıcı bankadan gelen gerçek
                                // tutarı biliyorsa kuru elle bulmak zorunda kalmasın.
                                let yeniKur = virman.kur;
                                if (girilen > 0 && sayi > 0 && soru) {
                                  const oran = soru.bolme ? girilen / sayi : sayi / girilen;
                                  yeniKur = String(Math.round(oran * 10000) / 10000);
                                }
                                setVirman({ ...virman, hedefTutar: h2, kur: yeniKur });
                              }}
                              style={{ ...inputStyle, width: 120 }} />
                          </Field>
                        </>
                      );
                    })()}
                    {/* VİRMAN SEBEBİ (kullanıcı, 17 Eylül: "virman sebebi seçilsin, örnek döviz
                        bozdurma gibi"). Sebep seçmek zorunlu: ay sonunda "bu 480.000 ₺ neden USD
                        kasasına gitti" sorusunun cevabı açıklama kutusunun serbest metnine
                        kalmasın. Liste kısa ve atölyenin gerçek işlerinden: uzun liste seçimi
                        yavaşlatır, kimse okumaz. "Diğer" seçilirse açıklama zorunlu olur. */}
                    {/* SEBEP — ÖĞRENEN LİSTE (kullanıcı, 17 Eylül: "tanımlara değil, bir kere girilen
                        kaydı hatırlasın, sonrasında o kayıt çıksın ve başka kayıt da girilebilsin").
                        Sabit liste değil: serbest yazılıyor, daha önce yazılanlar öneri olarak
                        çıkıyor. Öneriler AYRI BİR YERDE TUTULMUYOR — geçmiş virman hareketlerinin
                        `virmanSebebi` alanından toplanıyor. Kayıtların kendisi hafıza; ayrı liste
                        tutmak onu güncel tutma derdi getirirdi. Birkaç hazır öneri de var, ilk
                        kullanımda liste boş kalmasın diye. */}
                    <Field label="Sebep">
                      <input value={virman.sebep || ""} data-virman-sebep="1" list="virman-sebep-onerileri"
                        placeholder="Döviz bozdurma…"
                        onChange={(e) => setVirman({ ...virman, sebep: e.target.value })} style={{ ...inputStyle, width: 190 }} />
                      <datalist id="virman-sebep-onerileri">
                        {virmanSebepOnerileri.map((x) => <option key={x} value={x} />)}
                      </datalist>
                    </Field>
                    <Field label="Açıklama">
                      <input value={virman.aciklama} data-virman-aciklama="1" placeholder="Opsiyonel"
                        onChange={(e) => setVirman({ ...virman, aciklama: e.target.value })} style={{ ...inputStyle, width: 180 }} />
                    </Field>
                    <button className="btn-primary" data-virman-kaydet="1"
                      onClick={() => {
                        const tutar = parseFloat(virman.tutar);
                        const hedefHesap = (tumHesaplar || []).find((x) => x.id === virman.hedef);
                        if (!hedefHesap) return showToast("Hedef hesabı seçin");
                        if (!tutar || tutar <= 0) return showToast("Tutar girin");
                        if (!String(virman.sebep || "").trim()) return showToast("Virman sebebini yazın (örn. döviz bozdurma)");
                        const hedefPB = hedefHesap.paraBirimi || "TRY";
                        const soru2 = hedefPB === pb ? null : kurSorusu(pb, hedefPB, kurlar);
                        const kurSayisi = parseFloat(virman.kur !== undefined && virman.kur !== ""
                          ? virman.kur : (soru2 && soru2.onerilen));
                        const hedefTutar = hedefPB === pb
                          ? tutar
                          : (parseFloat(virman.hedefTutar) || (kurSayisi > 0 ? kurUygula(tutar, kurSayisi, soru2.bolme) : 0));
                        if (!hedefTutar || hedefTutar <= 0) return showToast(`Hedefe geçen tutarı girin (${hedefPB})`);
                        onVirman({
                          kaynak: { tur: birimAdi === "Kasa" ? "kasa" : "banka", id: h.id, ad: h.ad, tutar },
                          hedef: { tur: hedefHesap.tur, id: hedefHesap.id, ad: hedefHesap.ad, tutar: hedefTutar },
                          sebep: String(virman.sebep || "").trim(),
                          aciklama: virman.aciklama,
                        });
                        setVirman({ hedef: "", tutar: "", aciklama: "", sebep: "" });
                        setIslem(null);
                      }}
                      style={{ padding: "8px 14px", fontSize: 13 }}>
                      Virmanı Kaydet
                    </button>
                  </div>
                )}

                {acik && islem && islem !== "virman" && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {(() => {
                      // "P.Birimi" HER ZAMAN bu hesabın kendi para birimidir (sabit) — kasa/banka
                      // bakiyesi HER ZAMAN bu para biriminde, çevrimsiz değişir. "Dönüştürülecek
                      // P.Birimi" + "Kur" İSE SADECE, bir Cari seçiliyse, o cariye HANGİ para biriminde
                      // ve NE KADAR ("Hesaba İşlecek Tutar/P.Birimi") işleneceğini belirler — kasanın
                      // kendi tutarından tamamen ayrı, ikinci bir hesaptır.
                      const cariSeciliMi = !!hForm.cariId;
                      const donusturulecekPB = hForm.donusturulecekPB || pb;
                      const cevrimVarMi = cariSeciliMi && donusturulecekPB !== pb;
                      const kurSoru = cevrimVarMi ? kurSorusu(pb, donusturulecekPB, kurlar) : null;
                      const kurGosterilecek = cevrimVarMi ? (hForm.kur !== "" ? hForm.kur : (kurSoru && kurSoru.onerilen != null ? kurSoru.onerilen : "")) : 1;
                      const girilenTutar = parseFloat(hForm.tutar);
                      const hesabaIslecekTutar = cariSeciliMi && girilenTutar > 0 && parseFloat(kurGosterilecek) > 0
                        ? (cevrimVarMi ? kurUygula(girilenTutar, parseFloat(kurGosterilecek), kurSoru.bolme) : girilenTutar)
                        : null;
                      return (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10, background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", padding: 10 }}>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            Yön
                            <select value={hForm.yon} onChange={(e) => setHForm({ ...hForm, yon: e.target.value })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}>
                              <option value="Giriş">Giriş (+)</option>
                              <option value="Çıkış">Çıkış (−)</option>
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            {/* KARŞI TARAF (17 Eylül): "Cari (opsiyonel)" idi. Ödeme/tahsilatta cari
                                ZORUNLU (v1.314.0); serbest kayıtta ise karşı taraf GİDER/GELİR KARTI
                                olabiliyor. Kart seçimi aşağıda; ikisinden biri dolu olmalı. */}
                            {islem === "serbest" ? "Cari (kart seçerseniz boş bırakın)" : "Cari"}
                            <select value={hForm.cariId} onChange={(e) => setHForm({ ...hForm, cariId: e.target.value, giderKartId: e.target.value ? "" : hForm.giderKartId })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, minWidth: 130 }}>
                              <option value="">Seçin…</option>
                              {secilebilirler(cariler, hForm.cariId).map((c) => <option key={c.id} value={c.id}>{secenekEtiketi(c, c.unvan)}</option>)}
                            </select>
                          </label>
                          {/* GİDER / GELİR KARTI — kira, elektrik, personel gibi alışı olmayan
                              kalemler. Karşı tarafı olmayan para hareketi bırakmamak için:
                              cari yoksa kart, kart yoksa cari. */}
                          {(giderKartlari || []).length > 0 && (
                            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                              Gider / gelir kartı
                              <select value={hForm.giderKartId || ""} data-gider-kart-sec="1"
                                onChange={(e) => setHForm({ ...hForm, giderKartId: e.target.value, cariId: e.target.value ? "" : hForm.cariId })}
                                style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, minWidth: 150 }}>
                                <option value="">Seçin…</option>
                                {(giderKartlari || []).map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                              </select>
                            </label>
                          )}
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            Tutar
                            <input
                              type="number" step="any" min="0"
                              value={hForm.tutar}
                              onChange={(e) => setHForm({ ...hForm, tutar: e.target.value })}
                              title="Bu tutar, hesabın kendi para biriminde (P.Birimi), ÇEVRİMSİZ olarak kasa/banka bakiyesine işlenir"
                              style={{ width: 85, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                            />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            P.Birimi
                            <select value={pb} disabled title="Bu hesabın kendi para birimi — sabittir, değiştirilemez. Tutar bu para biriminde kasaya işlenir." style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, background: "var(--erp-panel-2)", color: "var(--erp-text-2)" }}>
                              <option value={pb}>{pb}</option>
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: cariSeciliMi ? "var(--erp-text-2)" : "var(--erp-border)", fontWeight: 600 }}>
                            Dönüştürülecek P.Birimi
                            <select
                              value={donusturulecekPB}
                              disabled={!cariSeciliMi}
                              onChange={(e) => setHForm({ ...hForm, donusturulecekPB: e.target.value === pb ? null : e.target.value, kur: "", hedefTutar: "" })}
                              title={cariSeciliMi ? "Seçili cariye HANGİ para biriminde işleneceğini seçin — kasanınkinden farklıysa Kur ile çevrilir" : "Önce bir Cari seçin"}
                              style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, background: cariSeciliMi ? "#fff" : "var(--erp-panel-2)" }}
                            >
                              {MUHASEBE_PARA_BIRIMLERI.map((mpb) => <option key={mpb} value={mpb}>{mpb}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            {/* SORU HER ZAMAN DÖVİZ ÜZERİNDEN: "1 EUR = ? TRY". Ters yön
                                (1 TRY = 0,0179 EUR) kimsenin kafasında öyle durmuyor. */}
                            Kur (1 {kurSoru ? kurSoru.a : pb} = ? {kurSoru ? kurSoru.b : donusturulecekPB})
                            <input
                              type="number" step="0.0001" min="0"
                              value={kurGosterilecek}
                              disabled={!cevrimVarMi}
                              // Kur elle yazılınca hedef tutar SERBEST bırakılıyor: aşağıdaki
                              // kutu yeniden kurdan hesaplanmış değeri gösterir. Bırakılmasaydı
                              // eski hedef tutar ekranda kalır, kurla tutmazdı.
                              onChange={(e) => setHForm({ ...hForm, kur: e.target.value, hedefTutar: "" })}
                              placeholder={cevrimVarMi && (!kurSoru || kurSoru.onerilen == null) ? "Elle girin" : ""}
                              title={cevrimVarMi ? "Otomatik olarak Muhasebe'deki güncel kurdan öneriliyor — isterseniz sadece bu işlem için değiştirebilirsiniz" : "Aynı para birimi olduğu için (ya da cari seçilmediği için) kur 1'dir"}
                              style={{ width: 75, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, background: cevrimVarMi ? "#fff" : "var(--erp-panel-2)" }}
                            />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: cariSeciliMi ? "var(--erp-primary)" : "var(--erp-border)", fontWeight: 700 }}>
                            Cariye İşlecek Tutar
                            {/* ÇİFT YÖNLÜ. Kullanıcı ya kuru bilir ("bugün euro 56") ya karşı
                                taraftaki tutarı ("1000 dolara sayıyoruz"). Buraya yazılan sayı
                                KURU geri hesaplıyor; kur kutusuna yazılan sayı da bu tutarı.
                                Hangisinin bilindiği duruma göre değişiyor, form ikisini de kabul
                                ediyor. Çevrim yoksa (aynı para birimi) kutu okunur kalıyor —
                                yazılacak bir kur yok. */}
                            {cevrimVarMi ? (
                              <input
                                type="number" step="any" min="0"
                                className="mono"
                                value={hForm.hedefTutar !== "" && hForm.hedefTutar != null
                                  ? hForm.hedefTutar
                                  : (hesabaIslecekTutar != null ? hesabaIslecekTutar : "")}
                                onChange={(e) => {
                                  const hedef = parseFloat(e.target.value);
                                  const kaynak = parseFloat(hForm.tutar);
                                  const yeniKur = kurTersHesapla(kaynak, hedef, kurSoru.bolme);
                                  // Kur da GÜNCELLENİYOR: iki alan tek gerçeğin iki yüzü, biri
                                  // eskirse ekranda tutmayan bir çift kalırdı.
                                  setHForm({ ...hForm, hedefTutar: e.target.value, kur: yeniKur != null ? String(yeniKur) : hForm.kur });
                                }}
                                title="Karşı tarafta tutulacak tutarı buraya yazarsanız kur kendiliğinden hesaplanır"
                                style={{ padding: "5px 7px", border: "1px solid #8FA888", borderRadius: "var(--erp-r-sm)", fontSize: 12, background: "#F0F5EE", width: 90, textAlign: "right" }}
                              />
                            ) : (
                              <div
                                className="mono"
                                style={{ padding: "5px 7px", border: `1px solid ${cariSeciliMi ? "#8FA888" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-sm)", fontSize: 12, background: cariSeciliMi ? "#F0F5EE" : "var(--erp-panel-2)", minWidth: 80, textAlign: "right" }}
                              >
                                {cariSeciliMi ? (hesabaIslecekTutar != null ? hesabaIslecekTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : "—") : "—"}
                              </div>
                            )}
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: cariSeciliMi ? "var(--erp-primary)" : "var(--erp-border)", fontWeight: 700 }}>
                            Cariye İşlecek P.Birimi
                            <select
                              value={donusturulecekPB}
                              disabled
                              title="Cariye bu para biriminde işlenecek — 'Dönüştürülecek P.Birimi' ile aynı"
                              className="mono"
                              style={{ padding: "5px 7px", border: `1px solid ${cariSeciliMi ? "#8FA888" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-sm)", fontSize: 12, background: cariSeciliMi ? "#F0F5EE" : "var(--erp-panel-2)", color: cariSeciliMi ? "var(--erp-primary)" : "var(--erp-border)", fontWeight: 700 }}
                            >
                              <option value={donusturulecekPB}>{donusturulecekPB}</option>
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                            Defter
                            <select value={hForm.defter} onChange={(e) => setHForm({ ...hForm, defter: e.target.value })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}>
                              <option value="Genel">Genel</option>
                              <option value="Resmi">Resmi</option>
                              <option value="Muhasebe">Muhasebe (ikisine de)</option>
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600, flex: 1, minWidth: 130 }}>
                            Açıklama
                            <input value={hForm.aciklama} onChange={(e) => setHForm({ ...hForm, aciklama: e.target.value })} placeholder="Opsiyonel" style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }} />
                          </label>
                          <button className="btn-primary" onClick={() => hareketiKaydet(h.id, pb)}><Plus size={13} /> Ekle</button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* DÜZENLEME PANELİ: seçilen hareketin üstünde açılıyor. */}
                {acik && duzenle && duzenle.hesapId === h.id && (
                  <div data-duzenle-paneli="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
                    padding: "10px 12px", background: "#F6EEDD", borderTop: "1px solid #E4D8C0", borderBottom: "1px solid #E4D8C0" }}>
                    <Field label="Tarih">
                      <input type="date" value={duzenle.tarih} data-duzenle-tarih="1"
                        onChange={(e) => setDuzenle({ ...duzenle, tarih: e.target.value })} style={{ ...inputStyle, width: 150 }} />
                    </Field>
                    <Field label={`Tutar (${sembol})`}>
                      <input type="number" min="0" step="any" value={duzenle.tutar} data-duzenle-tutar="1"
                        onChange={(e) => setDuzenle({ ...duzenle, tutar: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                    </Field>
                    <Field label="Açıklama">
                      <input value={duzenle.aciklama} data-duzenle-aciklama="1"
                        onChange={(e) => setDuzenle({ ...duzenle, aciklama: e.target.value })} style={{ ...inputStyle, width: 220 }} />
                    </Field>
                    <button className="btn-primary" data-duzenle-kaydet="1" style={{ padding: "8px 14px", fontSize: 13 }}
                      onClick={() => {
                        const tutar = parseFloat(duzenle.tutar);
                        if (!tutar || tutar <= 0) return showToast("Tutar girin");
                        onHareketGuncelle(h.id, duzenle.hareketId, {
                          tutar, tarih: duzenle.tarih, aciklama: duzenle.aciklama,
                        });
                        setDuzenle(null);
                      }}>
                      Kaydet
                    </button>
                    <button className="btn-ghost" data-duzenle-vazgec="1" style={{ padding: "8px 12px", fontSize: 13 }}
                      onClick={() => setDuzenle(null)}>Vazgeç</button>
                  </div>
                )}

                {/* HAREKET LİSTESİ FORMDAN AYRI (17 Eylül): hesap açılınca İLK görünen şey bu.
                    Form yalnız bir işlem seçilince açılıyor; liste her zaman duruyor. Bölmeden
                    önce liste de formun içindeydi ve işlem seçilmeden hareketler görünmüyordu. */}
                {acik && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {(h.hareketler || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Henüz hareket yok.</div>
                    ) : (() => {
                      const tumHareketler = h.hareketler || [];
                      // "Muhasebe" hareketi HER İKİ sekmede de sayılıyor ve listeleniyor —
                      // etiketi zaten "ikisine de" diyor. Sayaçlar ve liste aynı kuraldan
                      // (`defterKapsar`) geçiyor; ayrı yazılsalardı biri sayıp diğeri
                      // göstermeyebilirdi.
                      const genelSayi = tumHareketler.filter((hr) => defterKapsar(hr.defter, "Genel")).length;
                      const resmiSayi = tumHareketler.filter((hr) => defterKapsar(hr.defter, "Resmi")).length;
                      const filtrelenmis = tumHareketler.filter((hr) => defterKapsar(hr.defter, defterFiltre));
                      // Ekstre mantığıyla aynı: hareketler ESKİDEN YENİYE sıralanır ve koşan bakiye HER
                      // SATIRDA hesaplanır — SADECE seçili defterin (Tümü/Genel/Resmi) hareketleri
                      // üzerinden, aktif sekmeye göre AYRI bir bakiye akışı takip edilir.
                      const eskidenYeniye = [...filtrelenmis].reverse();
                      let kosanBakiye = 0;
                      const satirlar = eskidenYeniye.map((hr) => {
                        kosanBakiye += hr.yon === "Giriş" ? hr.tutar : -hr.tutar;
                        return { hr, kosanBakiye };
                      }).reverse(); // tekrar en yeni en üste al (görüntüleme sırası korunur)

                      // Koşan bakiye YUKARIDA, filtrelenmemiş küme üzerinden hesaplandı ve satıra
                      // yazıldı. Sütun filtresi SADECE gösterimi kısar — bakiye sütunu hesabın
                      // gerçek seyrini göstermeye devam eder.
                      const kEsler = (metin, aranan) =>
                        String(metin || "").toLocaleLowerCase("tr-TR").includes(aranan.toLocaleLowerCase("tr-TR"));
                      const gorunenSatirlar = satirlar.filter(({ hr }) => {
                        if (kolonFiltre.tarih.trim() && !kEsler(hr.tarih, kolonFiltre.tarih.trim())) return false;
                        if (kolonFiltre.aciklama.trim()) {
                          const cariAdi = hr.cariId ? (((cariler || []).find((c) => c.id === hr.cariId) || {}).unvan || "") : "";
                          const havuz = [cariAdi, hr.aciklama, hr.defter];
                          if (!havuz.some((x) => kEsler(x, kolonFiltre.aciklama.trim()))) return false;
                        }
                        const esikG = parseFloat(String(kolonFiltre.giris).replace(",", "."));
                        if (Number.isFinite(esikG) && (hr.yon !== "Giriş" || hr.tutar < esikG)) return false;
                        const esikC = parseFloat(String(kolonFiltre.cikis).replace(",", "."));
                        if (Number.isFinite(esikC) && (hr.yon === "Giriş" || hr.tutar < esikC)) return false;
                        return true;
                      });
                      const toplamGiris = gorunenSatirlar.filter(({ hr }) => hr.yon === "Giriş").reduce((s, { hr }) => s + hr.tutar, 0);
                      const toplamCikis = gorunenSatirlar.filter(({ hr }) => hr.yon !== "Giriş").reduce((s, { hr }) => s + hr.tutar, 0);

                      const kFiltreKutusu = (alan, ipucu, sayisalMi) => (
                        <input
                          type="text"
                          inputMode={sayisalMi ? "decimal" : "text"}
                          value={kolonFiltre[alan]}
                          onChange={(e) => setKolonFiltre({ ...kolonFiltre, [alan]: e.target.value })}
                          placeholder={ipucu}
                          className="mono"
                          style={{
                            width: "100%", minWidth: sayisalMi ? 58 : 80, padding: "3px 6px", fontSize: 11,
                            border: `1px solid ${kolonFiltre[alan].trim() ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
                            background: kolonFiltre[alan].trim() ? "#FBF0E2" : "#fff",
                            borderRadius: "var(--erp-r-sm)", textAlign: sayisalMi ? "right" : "left", boxSizing: "border-box",
                          }}
                        />
                      );
                      return (
                        <>
                          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                            {[
                              { key: "Tümü", sayi: tumHareketler.length },
                              { key: "Genel", sayi: genelSayi },
                              { key: "Resmi", sayi: resmiSayi },
                            ].map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => setDefterFiltre(s.key)}
                                style={{
                                  padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                  border: `1.5px solid ${defterFiltre === s.key ? "var(--erp-brown)" : "var(--erp-border)"}`,
                                  background: defterFiltre === s.key ? "#8A5A381A" : "#fff",
                                  color: defterFiltre === s.key ? "var(--erp-brown)" : "var(--erp-text-2)",
                                }}
                              >
                                {s.key} <span className="mono" style={{ fontWeight: 400 }}>({s.sayi})</span>
                              </button>
                            ))}
                          </div>
                          {satirlar.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{defterFiltre} defterinde hareket yok.</div>
                          ) : (
                          <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1.5px solid #C9B99A" }}>
                                <th style={{ textAlign: "left", padding: "4px 6px", color: "var(--erp-text-2)" }}>Tarih</th>
                                <th style={{ textAlign: "left", padding: "4px 6px", color: "var(--erp-text-2)" }}>Açıklama</th>
                                <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-primary)" }}>Giriş</th>
                                <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-warn)" }}>Çıkış</th>
                                <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-text-2)" }}>Bakiye</th>
                                <th style={{ width: 20 }}></th>
                              </tr>
                              {/* Sütun filtre satırı. Bakiye sütununda kutu yok — türetilmiş değer. */}
                              <tr style={{ borderBottom: "1px solid #E4D8C0" }}>
                                <th style={{ padding: "3px 6px" }}>{kFiltreKutusu("tarih", "tarih…")}</th>
                                <th style={{ padding: "3px 6px" }}>{kFiltreKutusu("aciklama", "cari, açıklama…")}</th>
                                <th style={{ padding: "3px 6px" }}>{kFiltreKutusu("giris", "≥", true)}</th>
                                <th style={{ padding: "3px 6px" }}>{kFiltreKutusu("cikis", "≥", true)}</th>
                                <th></th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {gorunenSatirlar.length === 0 && (
                                <tr>
                                  <td colSpan={6} style={{ padding: "12px 6px", textAlign: "center", fontSize: 12, color: "var(--erp-text-3)" }}>
                                    Bu filtreyle eşleşen hareket yok.
                                  </td>
                                </tr>
                              )}
                              {gorunenSatirlar.map(({ hr, kosanBakiye: kb }) => {
                                const cari = hr.cariId ? (cariler || []).find((c) => c.id === hr.cariId) : null;
                                return (
                                  <tr key={hr.id} style={{ borderTop: "1px solid #E4D8C0" }}>
                                    <td className="mono" style={{ padding: "5px 6px", color: "var(--erp-text-3)", whiteSpace: "nowrap" }}>{tarihYaz(hr.tarih, true)}</td>
                                    <td style={{ padding: "5px 6px", color: "var(--erp-text)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        {cari && <span style={{ color: "var(--erp-info)", fontWeight: 600 }}>{cari.unvan}</span>}
                                        {hr.defter && hr.defter !== "Genel" && (
                                          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-panel-2)", padding: "1px 5px", borderRadius: "var(--erp-r-pill)" }}>
                                            {hr.defter === "Muhasebe" ? "Muhasebe (ikisine de)" : hr.defter}
                                          </span>
                                        )}
                                        {/* İŞLEM TİPİ ROZETİ — tahsilat yeşil, ödeme kiremit
                                            (bkz. HAREKET_TIPI_RENK). Kasa listesinde bir satırın
                                            tahsilat mı ödeme mi olduğu yalnız Giriş/Çıkış
                                            sütunundan anlaşılıyordu; renk bunu satırın başında
                                            söylüyor. Cari ekstresiyle AYNI renk tablosu ve AYNI
                                            tip çıkarımı (`hareketIslemTipi`) kullanılıyor —
                                            iki ekran aynı harekete farklı renk vermesin. */}
                                        {(() => {
                                          const tip = hareketIslemTipi(hr);
                                          if (!tip) return null;
                                          const renk = HAREKET_TIPI_RENK[tip] || "var(--erp-text-2)";
                                          return (
                                            <span className="mono" style={{
                                              fontSize: 9, fontWeight: 700, color: renk,
                                              background: `${renk}1A`, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                                            }}>
                                              {tip}
                                            </span>
                                          );
                                        })()}
                                        {hr.aciklama && <span style={{ color: "var(--erp-text-2)" }}>{hr.aciklama}</span>}
                                      </div>
                                    </td>
                                    <td className="mono" style={{ padding: "5px 6px", textAlign: "right", color: "var(--erp-primary)", fontWeight: 600 }}>
                                      {hr.yon === "Giriş" ? `${hr.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembol}` : ""}
                                    </td>
                                    <td className="mono" style={{ padding: "5px 6px", textAlign: "right", color: "var(--erp-warn)", fontWeight: 600 }}>
                                      {hr.yon !== "Giriş" ? `${hr.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembol}` : ""}
                                    </td>
                                    <td className="mono" style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>
                                      {kb.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}
                                    </td>
                                    <td style={{ padding: "5px 2px", textAlign: "center", whiteSpace: "nowrap" }}>
                                      {/* DÜZENLE (kullanıcı, 17 Eylül): yanlış tutar/tarih/açıklama için tek yol
                                          "sil ve yeniden gir"di; cariye bağlı hareketlerde bu iki kaydı da silip
                                          yeniden kurmak demekti. Artık satır içinde düzeltiliyor ve karşı taraf
                                          (cari hareketi) aynı bağ üzerinden birlikte güncelleniyor.
                                          VİRMAN satırı düzenlenmiyor: iki hesabı birden ilgilendiriyor, tek
                                          taraftan değiştirmek ikisini ayrıştırırdı — virman silinip yeniden yapılır. */}
                                      {!hr.virmanMi && (
                                        <button
                                          data-hareket-duzenle={hr.id}
                                          onClick={() => setDuzenle({
                                            hesapId: h.id, hareketId: hr.id,
                                            tutar: String(hr.tutar || ""), tarih: hr.tarih || "",
                                            aciklama: hr.aciklama || "",
                                          })}
                                          title="Bu hareketi düzenle"
                                          className="btn-ikon"
                                        >
                                          <Pencil size={11} />
                                        </button>
                                      )}
                                      {/* SİLME ONAYLI (kullanıcı, 17 Eylül): tek dokunuşla siliniyordu; para
                                          kaydında yanlış dokunuş pahalı. İki dokunuş isteniyor. */}
                                      <SilOnayButonu
                                        onConfirm={() => onHareketSil(h.id, hr.id)}
                                        boyut={11}
                                        baslikNormal={silmeYetkisiVar === false ? "Silme yetkiniz yok — istek yönetici onayına gönderilir" : "Bu hareketi sil"}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {/* Süzülen toplam: görünen hareketlerin giriş/çıkış/net toplamı. Hesabın
                                kendi para birimi tek olduğu için burada para birimi ayrımına gerek yok. */}
                            {gorunenSatirlar.length > 0 && (
                              <tfoot>
                                <tr style={{ borderTop: "2px solid #C9B99A", background: "var(--erp-panel)" }}>
                                  <td style={{ padding: "6px 6px", fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                                    {kolonFiltreAktif ? "SÜZÜLEN TOPLAM" : "TOPLAM"}
                                  </td>
                                  <td className="mono" style={{ padding: "6px 6px", fontSize: 10, color: "var(--erp-text-3)" }}>
                                    {gorunenSatirlar.length}{kolonFiltreAktif ? ` / ${satirlar.length}` : ""} hareket
                                  </td>
                                  <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--erp-primary)" }}>
                                    {toplamGiris > 0 ? `${toplamGiris.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembol}` : "—"}
                                  </td>
                                  <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                                    {toplamCikis > 0 ? `${toplamCikis.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembol}` : "—"}
                                  </td>
                                  <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: (toplamGiris - toplamCikis) >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                                    {(toplamGiris - toplamCikis).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                          </div>
                          )}
                        </>
                      );
                    })()}
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {/* DÜZENLEME (kullanıcı, 19 Eylül: "banka listesi düzenleme olsun"). Hesap
                          adı, banka ve IBAN yanlış girildiğinde tek yol hesabı silip yeniden
                          açmaktı — hareketi olan hesap silinemediği için bu da mümkün değildi;
                          yanlış ad kalıcı oluyordu. Para birimi düzenlenmiyor: hareketler o
                          birimde yazıldı, sonradan değiştirmek geçmişi yanlış gösterirdi. */}
                      {duzenlenen === h.id ? (
                        <>
                          {ekleAlanlari.map((a2) => (
                            <input key={a2.key} value={duzenForm[a2.key] || ""}
                              data-hesap-duzenle={a2.key}
                              placeholder={a2.placeholder}
                              onChange={(e) => setDuzenForm({ ...duzenForm, [a2.key]: e.target.value })}
                              style={{ padding: "5px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, width: 150 }} />
                          ))}
                          <button data-kart-eylem="kaydet" title="Kaydet · Ctrl+S" type="button" className="btn-primary" style={{ fontSize: 12, padding: "5px 12px" }}
                            onClick={() => { if (onHesapGuncelle) onHesapGuncelle(h.id, duzenForm); setDuzenlenen(null); }}>
                            Kaydet
                          </button>
                          <button type="button" className="btn-ghost" data-kart-eylem="vazgec" title="Vazgeç · Esc" style={{ fontSize: 12, padding: "5px 12px" }}
                            onClick={() => setDuzenlenen(null)}>Vazgeç</button>
                        </>
                      ) : (
                        <button type="button" className="btn-ghost" data-hesap-duzenle-ac={h.id} data-kart-eylem="duzenle"
                          style={{ fontSize: 12, padding: "5px 12px" }}
                          onClick={() => {
                            const form = {};
                            ekleAlanlari.forEach((a2) => { form[a2.key] = h[a2.key] || ""; });
                            setDuzenForm(form);
                            setDuzenlenen(h.id);
                          }}>
                          <Pencil size={12} /> Düzenle
                        </button>
                      )}
                      <PasifButonu
                        pasif={!!h.pasif}
                        etiket={birimAdi}
                        onDegistir={() => onHesapPasifDegistir(h.id, !h.pasif)}
                      />
{/* Düzenleme modunda Sil gizli — kart kalıbı: düzenlemede yalnız Kaydet · Vazgeç. */}
                      {duzenlenen !== h.id && (
                      <SilOnayButonu kartEylemi
                        onConfirm={() => onHesapSil(h.id)}
                        boyut={12}
                        baslikNormal={
                          (h.hareketler || []).length > 0
                            ? `${birimAdi} silinemez — ${(h.hareketler || []).length} hareket kayıtlı`
                            : silmeYetkisiVar === false
                              ? `${birimAdi}'ı sil (yönetici onayına gider)`
                              : `${birimAdi}'ı sil`
                        }
                      />
                      )}
                    </div>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

const CEK_DURUM_RENK = {
  "Portföyde": "var(--erp-brown)", "Tahsil Edildi": "var(--erp-primary)", "Ciro Edildi": "var(--erp-info)", "Karşılıksız": "var(--erp-warn)",
};

// `onDurumGuncelle` KALDIRILDI: durum artık listeden seçilmiyor, işlemler penceresinden geçiyor.
// Kullanılmayan bir prop, "buradan da değiştirilebilir" izlenimi bırakırdı.
function CekListesi({ cekler, cariler, bankalar, kasalar, kurlar, gorseller, onEkle, onSil, onIslem, onGorselKaydet }) {
  const [showYeni, setShowYeni] = useState(false);
  // İŞLEMLER AÇILIR PENCEREDE (kullanıcı, 6 Eylül: "onlar için ekran kalabalık olur, İşlemler
  // diye buton ekle, tıklayınca seçtir, açılır pencere olduğu gibi"). Beş işlem × her satır,
  // satır içinde gösterilseydi liste okunamaz hâle gelirdi.
  const [islemCek, setIslemCek] = useState(null);
  const [secilenIslem, setSecilenIslem] = useState(null);
  const [islemForm, setIslemForm] = useState({ cariId: "", bankaId: "", hesapSecim: "", tutar: "", paraBirimi: "", kurGirdi: "", not: "" });
  // Geçmişi açık olan çek. Kapalı başlıyor: çoğu bakışta ilgilenilen şey durum, geçmiş değil.
  const [gecmisCekId, setGecmisCekId] = useState(null);
  // Alanlar cari kartındaki çek girişiyle AYNI: iki ekranda farklı alan kümesi olması, aynı çekin
  // nereden girildiğine göre eksik kalmasına yol açardı.
  // `tlKarsiligi` + `kur`: dövizli çekin kayıt anındaki TL değeri. Vade geldiğinde kur değişmiş
  // olacak; çekin GİRİLDİĞİ günkü karşılığı ayrı bir bilgi ve sonradan hesaplanamaz.
  const BOS_CEK = { tip: "Alınan", cekNo: "", cariId: "", tutar: "", vadeTarihi: "", not: "", paraBirimi: "TRY", banka: "", sube: "", iban: "", kesideci: "", sahiplik: "Kendi", tlKarsiligi: "", kur: "" };
  const [form, setForm] = useState(BOS_CEK);
  const [filtre, setFiltre] = useState("Tümü");
  // KENDİ ÇEK DEFTERİMİZ (kullanıcı, 6 Eylül: "verilen çek için kendi çek defterimiz olması
  // gerekiyor"). Alınan çek başkasının kefaletiyle gelir ve portföyde durur; şahsi çek çıkışı
  // BİZİM imzamızdır ve bir BORÇTUR. İkisini tek listede karıştırmak, portföy toplamını da
  // anlamsız kılıyordu (biri artı, diğeri eksi sayılıyor ama aynı satırda görünüyorlardı).
  const [tipSekmesi, setTipSekmesi] = useState("Alınan");
  // Şube önerileri mevcut çek kayıtlarından öğreniliyor (bkz. `bilinenSubeler`).
  const subeOnerileri = bilinenSubeler(cekler, form.banka);

  function kaydet() {
    const tutar = parseFloat(form.tutar);
    if (!tutar || tutar <= 0 || !form.vadeTarihi) return;
    // TL karşılığı ve kur SAYI olarak saklanıyor; boşsa hiç yazılmıyor (TRY çeklerde anlamsız).
    const tl = parseFloat(form.tlKarsiligi);
    const kurSayi = parseFloat(form.kur);
    onEkle({
      ...form, tutar,
      tlKarsiligi: tl > 0 ? tl : undefined,
      kur: kurSayi > 0 ? kurSayi : (tl > 0 && tutar > 0 ? Math.round((tl / tutar) * 10000) / 10000 : undefined),
    });
    setForm(BOS_CEK);
    setShowYeni(false);
  }

  const tipeGore = cekler.filter((c) => (c.tip || "Alınan") === tipSekmesi);
  const gorunenler = filtre === "Tümü" ? tipeGore : tipeGore.filter((c) => c.durum === filtre);
  // Farklı para birimlerindeki çekleri toplamak anlamsız olduğu için, portföy toplamı da para
  // birimine göre ayrı ayrı hesaplanır.
  const portfoyToplamlari = {};
  // Toplam GÖRÜNEN sekmeye ait: alınan sekmesinde portföydeki alacak, şahsi sekmesinde
  // ödenmemiş borç. Tek toplamda ikisini artı-eksi toplamak, "elimde ne kadar çek var"
  // sorusunun cevabını gizliyordu.
  tipeGore.filter((c) => c.durum === "Portföyde").forEach((c) => {
    const pb = c.paraBirimi || "TRY";
    portfoyToplamlari[pb] = (portfoyToplamlari[pb] || 0) + c.tutar;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.keys(portfoyToplamlari).length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--erp-text-2)" }}>Portföydeki net çek tutarı: <span className="mono" style={{ fontWeight: 700 }}>0 ₺</span></span>
          ) : (
            Object.entries(portfoyToplamlari).map(([pb, toplam]) => (
              <span key={pb} style={{ fontSize: 13, color: "var(--erp-text-2)" }}>
                Portföy ({pb}):{" "}
                <span className="mono" style={{ fontWeight: 700, color: toplam >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>
                  {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pb] || pb}
                </span>
              </span>
            ))
          )}
        </div>
        {/* YENİ ÇEK, AÇIK SEKMENİN TİPİYLE başlıyor: "Şahsi Çek Çıkışı" sekmesindeyken açılan
            formun "Alınan" gelmesi, en sık yapılan hatayı davet ederdi. */}
        <button
          className="btn-primary"
          onClick={() => { setForm({ ...BOS_CEK, tip: tipSekmesi }); setShowYeni((v) => !v); }}
        >
          <Plus size={14} /> {tipSekmesi === "Verilen" ? "Şahsi Çek Yaz" : "Yeni Çek"}
        </button>
      </div>

      {/* İKİ DEFTER — alınan çekler ve kendi yazdığımız çekler. Bunlar farklı şeyler: alınan çek
          bir ALACAK ve elimizde duruyor; şahsi çek çıkışı bizim İMZAMIZ ve bir BORÇ. Aynı listede
          göstermek portföy toplamını da anlamsız kılıyordu. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[
          { deger: "Alınan", ad: "Alınan Çekler", renk: "var(--erp-primary)" },
          { deger: "Verilen", ad: "Şahsi Çek Çıkışı", renk: "var(--erp-warn)" },
        ].map((t) => {
          const aktif = tipSekmesi === t.deger;
          const sayi = cekler.filter((c) => (c.tip || "Alınan") === t.deger).length;
          return (
            <button
              key={t.deger}
              type="button"
              onClick={() => setTipSekmesi(t.deger)}
              style={{
                padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${aktif ? t.renk : alfaEkle(t.renk, "66")}`,
                background: aktif ? t.renk : alfaEkle(t.renk, "14"),
                color: aktif ? "var(--erp-panel)" : t.renk,
              }}
            >
              {t.ad} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["Tümü", "Portföyde", "Tahsilde", "Tahsil Edildi", "Ciro Edildi", "İade Edildi", "Karşılıksız"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            style={{
              padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${filtre === f ? "var(--erp-purple)" : "var(--erp-border)"}`,
              background: filtre === f ? "#6B4E8A1A" : "#fff",
              color: filtre === f ? "var(--erp-purple)" : "var(--erp-text-2)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {showYeni && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Tip
            <select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}>
              {/* "Verilen" YETERSİZ BİR AD: kullanıcı (6 Eylül) "verilende kendimiz çek
                  yazmışız demektir, onu da şahsi çek çıkışı olarak isimlendir" dedi. Alınan çek
                  başkasının kefaletiyle gelir, verilen çek BİZİM imzamızdır — ikisi farklı risk.
                  Depodaki DEĞER değişmedi ("Verilen"), yalnız ekrandaki ad. */}
              <option value="Alınan">Alınan (müşteri çeki)</option>
              <option value="Verilen">Şahsi Çek Çıkışı (kendi çekimiz)</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Çek No
            <input value={form.cekNo} onChange={(e) => setForm({ ...form, cekNo: e.target.value })} style={{ width: 100, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Cari
            <select value={form.cariId} onChange={(e) => setForm({ ...form, cariId: e.target.value })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, minWidth: 140 }}>
              <option value="">Seçin…</option>
              {secilebilirler(cariler, form.cariId).map((c) => <option key={c.id} value={c.id}>{secenekEtiketi(c, c.unvan)}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            {/* PARA BİRİMİ SEÇİLEN BİRİMDEN OKUNUYOR. Etikette "₺" SABİT yazılıydı: dolar çeki
                girerken bile "Tutar (₺)" görünüyordu (kullanıcı bildirdi, 6 Eylül). */}
            Tutar ({PARA_SEMBOLU[form.paraBirimi || "TRY"] || form.paraBirimi})
            <input type="number" step="any" min="0" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} style={{ width: 100, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Para Birimi
            <select
              value={form.paraBirimi}
              onChange={(e) => {
                // Para birimi değişince TL karşılığı GÜNCEL KURDAN ön dolduruluyor.
                const yeniSoru = kurSorusu(e.target.value, "TRY", kurlar);
                const t = parseFloat(form.tutar);
                const on = yeniSoru && t > 0 ? kurUygula(t, yeniSoru.onerilen, yeniSoru.bolme) : null;
                setForm({ ...form, paraBirimi: e.target.value, tlKarsiligi: on != null ? String(on) : "", kur: "" });
              }}
              style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
            >
              {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
            </select>
          </label>
          {/* KUR ÇEVİRİCİ — kullanıcı (6 Eylül): "Çek girişi yaparken de kur çevirici gerekli.
              Bunu para olan HER YERDE yap mutlaka."
              Çift yönlü (7z-6'daki kural): TL karşılığına ya da kura yazılabiliyor. */}
          {(form.paraBirimi || "TRY") !== "TRY" && (() => {
            const soru = kurSorusu(form.paraBirimi, "TRY", kurlar);
            const tutar = parseFloat(form.tutar);
            const tl = parseFloat(form.tlKarsiligi);
            const kurKutusu = form.kur !== "" ? form.kur
              : (kurTersHesapla(tutar, tl, soru.bolme) ?? (soru.onerilen != null ? soru.onerilen : ""));
            return (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                  TL Karşılığı
                  <input
                    type="number" step="any" min="0"
                    value={form.tlKarsiligi}
                    onChange={(e) => setForm({ ...form, tlKarsiligi: e.target.value, kur: "" })}
                    title="Çekin giriş günündeki TL değeri — vade geldiğinde kur değişmiş olacak"
                    style={{ width: 110, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, textAlign: "right" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                  {`Kur (1 ${soru.a} = ? ${soru.b})`}
                  <input
                    type="number" step="any" min="0"
                    value={kurKutusu}
                    onChange={(e) => {
                      const yeniTl = kurUygula(tutar, parseFloat(e.target.value), soru.bolme);
                      setForm({ ...form, kur: e.target.value, tlKarsiligi: yeniTl != null ? String(yeniTl) : form.tlKarsiligi });
                    }}
                    style={{ width: 90, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                  />
                </label>
              </>
            );
          })()}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
            Vade Tarihi
            <input type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })} style={{ padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }} />
          </label>
          {(() => {
            const kutu = { padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 };
            const etiket = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 };
            return (
              <>
                <label style={{ ...etiket, width: 140 }}>
                  Banka
                  {/* Cari kartındaki çek girişiyle AYNI: hazır liste + elle yazma. */}
                  <input list="cek-banka-listesi" value={form.banka} onChange={(e) => setForm({ ...form, banka: e.target.value })} placeholder="Seç ya da yaz" style={kutu} />
                  <datalist id="cek-banka-listesi">
                    {BANKALAR.map((b) => <option key={b.kod} value={b.ad} />)}
                  </datalist>
                </label>
                <label style={{ ...etiket, width: 120 }}>
                  Şube
                  {/* Daha önce aynı bankaya girilmiş şubeler öneri olarak geliyor. */}
                  <input list="cek-sube-listesi" value={form.sube} onChange={(e) => setForm({ ...form, sube: e.target.value })} placeholder={subeOnerileri.length ? "Seç ya da yaz" : "Ops."} style={kutu} />
                  <datalist id="cek-sube-listesi">
                    {subeOnerileri.map((sb) => <option key={sb} value={sb} />)}
                  </datalist>
                </label>
                <label style={{ ...etiket, width: 170 }}>
                  IBAN / Hesap
                  {/* IBAN yazılınca banka otomatik doluyor; dolu bir banka alanı EZİLMİYOR. */}
                  <input
                    value={form.iban}
                    onChange={(e) => {
                      const iban = e.target.value;
                      setForm({ ...form, iban, banka: form.banka || ibandanBanka(iban) });
                    }}
                    placeholder="TR.. — banka otomatik"
                    style={{ ...kutu, fontFamily: "monospace" }}
                  />
                </label>
                <label style={etiket}>
                  Sahiplik
                  {/* Kendi mi cirolu mu: karşılıksız çıkarsa alacağın kimden isteneceğini belirler. */}
                  <div style={{ display: "flex", gap: 5 }}>
                    {["Kendi", "Cirolu"].map((se) => (
                      <button
                        key={se}
                        type="button"
                        onClick={() => setForm({ ...form, sahiplik: se })}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: "var(--erp-r-sm)", cursor: "pointer",
                          border: `1px solid ${form.sahiplik === se ? "var(--erp-brown)" : "var(--erp-border)"}`,
                          background: form.sahiplik === se ? "var(--erp-brown)" : "#fff",
                          color: form.sahiplik === se ? "#fff" : "var(--erp-text-2)",
                        }}
                      >
                        {se}
                      </button>
                    ))}
                  </div>
                </label>
                <label style={{ ...etiket, width: 150 }}>
                  Keşideci
                  <input value={form.kesideci} onChange={(e) => setForm({ ...form, kesideci: e.target.value })} placeholder={form.sahiplik === "Cirolu" ? "Çeki asıl yazan" : "Ops."} style={kutu} />
                </label>
                <label style={{ ...etiket, flex: 1, minWidth: 140 }}>
                  Not
                  <input value={form.not} onChange={(e) => setForm({ ...form, not: e.target.value })} placeholder="Opsiyonel" style={kutu} />
                </label>
              </>
            );
          })()}
          <button className="btn-primary btn-save" onClick={kaydet}><Save size={14} /> Kaydet</button>
          <button className="btn-ghost" onClick={() => setShowYeni(false)}>Vazgeç</button>
        </div>
      )}

      {gorunenler.length === 0 ? (
        <EmptyState text="Bu filtrede çek kaydı yok." />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {gorunenler.map((c) => {
            const cari = c.cariId ? (cariler || []).find((x) => x.id === c.cariId) : null;
            const renk = CEK_DURUM_RENK[c.durum] || "var(--erp-text-2)";
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", flexWrap: "wrap" }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: c.tip === "Alınan" ? "var(--erp-primary)" : "var(--erp-warn)" }}>{c.tip}</span>
                <span className="mono" style={{ fontSize: 12 }}>{c.cekNo || "—"}</span>
                {cari && <span style={{ fontSize: 12, color: "var(--erp-info)" }}>{cari.unvan}</span>}
                <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{c.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[c.paraBirimi || "TRY"] || c.paraBirimi}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Vade: {c.vadeTarihi}</span>
                {/* BANKA VE KEŞİDECİ LİSTEDE GÖRÜNÜR. Vadesi gelen çeki ararken "hangi banka,
                    kim yazmış" bilgisi satırda olmalı; kartı açıp bakmak gerekmemeli.
                    "Cirolu" rozeti ayrıca vurgulanıyor: karşılıksız çıkarsa alacak ciro edenden
                    değil KEŞİDECİden istenir, bu satırdaki en kritik ayrım odur. */}
                {c.banka && <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{c.banka}{c.sube ? ` / ${c.sube}` : ""}</span>}
                {c.sahiplik === "Cirolu" && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#8A3D6B", background: "#8A3D6B14", border: "1px solid #8A3D6B44", borderRadius: "var(--erp-r-pill)", padding: "1px 7px" }}>
                    cirolu
                  </span>
                )}
                {c.kesideci && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>keşideci: {c.kesideci}</span>}
                {c.hareketId && (
                  <span title="Cari hareketinden otomatik oluştu" style={{ fontSize: 10, color: "var(--erp-primary)" }}>· cariden</span>
                )}
                {c.not && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{c.not}</span>}
                {/* İŞLEMLER — hangi işlemlerin yapılabileceğine `cekIzinliIslemler` karar
                    veriyor; ekran kendi kuralını koymuyor. İşlem kalmamışsa (ciro edilmiş çek)
                    düğme hiç çıkmıyor: devre dışı bir düğme "neden basamıyorum" sorusu doğurur. */}
                {onIslem && cekIzinliIslemler(c).length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "3px 10px", fontSize: 11, color: "var(--erp-info)" }}
                    title="Ciro, iade, bankaya tahsile verme…"
                    onClick={() => {
                      setIslemCek(c);
                      setSecilenIslem(null);
                      setIslemForm({ cariId: "", bankaId: "", hesapSecim: "", tutar: String(c.tutar), paraBirimi: c.paraBirimi || "TRY", kurGirdi: "", not: "" });
                    }}
                  >
                    <ArrowRight size={12} /> İşlemler
                  </button>
                )}
                {(c.gecmis || []).length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "3px 10px", fontSize: 11, color: "var(--erp-text-2)" }}
                    onClick={() => setGecmisCekId(gecmisCekId === c.id ? null : c.id)}
                  >
                    <FileText size={12} /> Geçmiş ({(c.gecmis || []).length})
                  </button>
                )}
                {/* ÇEK RESMİ — ön ve arka. Fotoğraf ÇEKİN KENDİSİNİN kanıtı: numara, keşideci ve
                    banka elle girilirken yanlış yazılabilir, fotoğraf yazılamaz. Küçük önizleme
                    satırda; büyütmek ve değiştirmek için tıklanıyor. */}
                {onGorselKaydet && (() => {
                  const g = (gorseller || []).find((x) => x.id === c.id) || {};
                  return (
                    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                      <ColorSwatch
                        src={g.on || ""}
                        size={26}
                        baslik="Çekin ÖN yüzü"
                        onUrlSave={(src) => onGorselKaydet(c.id, { ...g, on: src })}
                        onRemove={g.on ? () => onGorselKaydet(c.id, { ...g, on: "" }) : undefined}
                      />
                      <ColorSwatch
                        src={g.arka || ""}
                        size={26}
                        baslik="Çekin ARKA yüzü"
                        onUrlSave={(src) => onGorselKaydet(c.id, { ...g, arka: src })}
                        onRemove={g.arka ? () => onGorselKaydet(c.id, { ...g, arka: "" }) : undefined}
                      />
                    </span>
                  );
                })()}
                {/* TAHSİLDEKİ ÇEKİN BANKASI listede duruyor — "hangi bankada tahsil bekliyor"
                    sorusu geçmişi açmayı gerektirmesin. */}
                {c.durum === "Tahsilde" && c.tahsilBankaAd && (
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-info)", background: "#3D6B8A14", padding: "2px 8px", borderRadius: "var(--erp-r-pill)" }}>
                    {c.tahsilBankaAd} · tahsilde
                  </span>
                )}
                {/* DURUM ARTIK SEÇİLMİYOR, GÖSTERİLİYOR (kullanıcı, 6 Eylül: "ciro edildi,
                    bankaya tahsilinde vs. seçmeli olmasın, zaten işlem yapıp yön belirliyoruz").
                    Serbest seçim, "Ciro Edildi" yazıp karşı tarafta hiçbir kayıt doğurmamak
                    demekti; işlemler penceresi hem durumu değiştiriyor hem gereken kaydı yazıyor. */}
                <span
                  className="mono"
                  style={{
                    marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)",
                    border: `1.5px solid ${renk}`, background: alfaEkle(renk, "1A"), color: renk, whiteSpace: "nowrap",
                  }}
                >
                  {c.durum}
                </span>
                <SilOnayButonu onConfirm={() => onSil(c.id)} boyut={12} />
                {/* GEÇMİŞ — aşama aşama, eskiden yeniye. Geçmiş EKLENİR, üzerine yazılmaz:
                    çekin nereden geçtiği sorusunun tek cevabı burası. */}
                {gecmisCekId === c.id && (
                  <div style={{ flexBasis: "100%", marginTop: 8, padding: 10, background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", display: "grid", gap: 4 }}>
                    {(c.gecmis || []).map((g) => (
                      <div key={g.id} className="mono" style={{ fontSize: 11, color: "var(--erp-text)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "var(--erp-text-3)" }}>{tarihYaz(g.tarih)}</span>
                        <b>{g.islem}</b>
                        <span style={{ color: "var(--erp-text-2)" }}>{g.oncekiDurum} → {g.yeniDurum}</span>
                        {g.cariAd && <span style={{ color: "var(--erp-info)" }}>{g.cariAd}</span>}
                        {g.bankaAd && <span style={{ color: "var(--erp-info)" }}>{g.bankaAd}</span>}
                        {g.tutar != null && g.paraBirimi && (
                          <span>{g.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[g.paraBirimi] || g.paraBirimi}</span>
                        )}
                        {g.kullanici && <span style={{ color: "var(--erp-text-3)" }}>· {g.kullanici}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- İŞLEM PENCERESİ -----------------------------------------------------------------
          İki aşamalı: önce hangi işlem, sonra o işlemin gerektirdiği alanlar. Beş işlemin
          alanlarını birden göstermek pencereyi de liste kadar kalabalık yapardı. */}
      {islemCek && (() => {
        const c = islemCek;
        const izinli = cekIzinliIslemler(c);
        const tanim = secilenIslem ? CEK_ISLEMLERI[secilenIslem] : null;
        const cekPB = c.paraBirimi || "TRY";
        // TAHSİL HESABI. Tahsildeki çekin parası VERİLDİĞİ BANKAYA girer; sorulmuyor, yazılıyor
        // (kullanıcı, 10 Eylül). Portföydeki çek doğrudan tahsil edildiyse hesap seçiliyor.
        const tahsilBankasi = c.durum === "Tahsilde" && c.tahsilBankaId
          ? (bankalar || []).find((b) => b.id === c.tahsilBankaId) || null : null;
        const hedefHesap = (() => {
          if (!tanim || !tanim.hesapGerekli) return null;
          if (tahsilBankasi) return { tur: "banka", hesap: tahsilBankasi, sabit: true };
          const [tur, id] = (islemForm.hesapSecim || "").split(":");
          const h = (tur === "kasa" ? (kasalar || []) : (bankalar || [])).find((x) => x.id === id);
          return h ? { tur, hesap: h, sabit: false } : null;
        })();
        // Hesaba girecek tutar HESABIN biriminde; ciroda cariye işlenecek birim seçilebiliyor.
        const hedefPB = hedefHesap ? (hedefHesap.hesap.paraBirimi || "TRY") : (islemForm.paraBirimi || cekPB);
        // Tahsil formu açılırken tutar hesabın birimine göre ön doluyor (kur çevirici, çift yönlü).
        const tahsilTutarOnerisi = (hesap) => {
          const pb = (hesap && hesap.paraBirimi) || "TRY";
          const sr = kurSorusu(cekPB, pb, kurlar);
          const on = sr ? kurUygula(c.tutar, sr.onerilen, sr.bolme) : c.tutar;
          return on != null ? String(on) : "";
        };
        const soru = kurSorusu(cekPB, hedefPB, kurlar);
        const hedefTutar = parseFloat(islemForm.tutar);
        const kurKutusu = (() => {
          if (!soru) return "";
          if (islemForm.kurGirdi !== "") return islemForm.kurGirdi;
          const k = kurTersHesapla(c.tutar, hedefTutar, soru.bolme);
          return k != null ? k : (soru.onerilen != null ? soru.onerilen : "");
        })();
        const eksik = tanim && ((tanim.cariGerekli && !islemForm.cariId) || (tanim.bankaGerekli && !islemForm.bankaId)
          || (tanim.hesapGerekli && (!hedefHesap || (hedefPB !== cekPB && !(parseFloat(islemForm.tutar) > 0)))));
        // Kur çevirici: ciroda her zaman, tahsilde hesap çekten farklı birimdeyse.
        const kurAlaniGoster = tanim && (tanim.cariGerekli || (tanim.hesapGerekli && hedefHesap && hedefPB !== cekPB));
        return (
          <div
            onClick={() => setIslemCek(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(34,27,20,.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "var(--erp-panel)", borderRadius: "var(--erp-r-lg)", padding: 16, width: "min(560px, 100%)", maxHeight: "85vh", overflowY: "auto", boxShadow: "none", }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <b style={{ fontSize: 15, color: "var(--erp-text)" }}>Çek İşlemleri</b>
                <button className="btn-ghost" style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 12 }} onClick={() => setIslemCek(null)}>
                  <X size={13} /> Kapat
                </button>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 12 }}>
                {c.cekNo ? `No ${c.cekNo}` : "numarasız"} · {c.tutar.toLocaleString("tr-TR")} {PARA_SEMBOLU[cekPB] || cekPB}
                {c.banka ? ` · ${c.banka}` : ""} · vade {c.vadeTarihi || "—"} · <b>{c.durum}</b>
              </div>

              {!secilenIslem ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {izinli.map((i) => (
                    <button
                      key={i.anahtar}
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "10px 12px", fontSize: 13, textAlign: "left", display: "block" }}
                      onClick={() => {
                        setSecilenIslem(i.anahtar);
                        // Tahsil bankası belliyse tutar onun birimine göre hemen ön doluyor.
                        if (i.anahtar === "tahsil" && tahsilBankasi) {
                          setIslemForm({ ...islemForm, tutar: tahsilTutarOnerisi(tahsilBankasi), kurGirdi: "" });
                        }
                      }}
                    >
                      <b>{i.ad}</b>
                      <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 2 }}>{i.aciklama}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    <b style={{ color: "var(--erp-text)" }}>{tanim.ad}</b> — {tanim.aciklama}
                  </div>

                  {tanim.cariGerekli && (
                    <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      Kime ciro ediliyor
                      <select
                        value={islemForm.cariId}
                        onChange={(e) => setIslemForm({ ...islemForm, cariId: e.target.value })}
                        style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                      >
                        <option value="">Seçin…</option>
                        {/* Çeki VEREN cariye geri ciro anlamsız — o işlemin adı "İade Et". */}
                        {(cariler || []).filter((x) => x.id !== c.cariId).map((x) => (
                          <option key={x.id} value={x.id}>{x.unvan}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {tanim.bankaGerekli && (
                    <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      Hangi bankaya tahsile veriliyor
                      {(bankalar || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                          Tanımlı banka yok — önce Banka sekmesinden ekleyin.
                        </span>
                      ) : (
                        <select
                          value={islemForm.bankaId}
                          onChange={(e) => setIslemForm({ ...islemForm, bankaId: e.target.value })}
                          style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                        >
                          <option value="">Seçin…</option>
                          {(bankalar || []).map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
                        </select>
                      )}
                    </label>
                  )}

                  {tanim.hesapGerekli && (
                    <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      {c.durum === "Tahsilde" ? "Paranın gireceği banka (çekin tahsile verildiği)" : "Para hangi kasaya/bankaya girdi"}
                      {hedefHesap && hedefHesap.sabit ? (
                        <span data-tahsil-hesabi="1" className="mono" style={{ fontSize: 12, color: "var(--erp-info)", fontWeight: 700 }}>
                          {hedefHesap.hesap.ad} · {hedefHesap.hesap.paraBirimi || "TRY"}
                        </span>
                      ) : ((kasalar || []).length + (bankalar || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                          Tanımlı kasa/banka yok — önce Kasa ya da Banka sekmesinden ekleyin.
                        </span>
                      ) : (
                        <select
                          value={islemForm.hesapSecim}
                          onChange={(e) => {
                            const [tur, id] = e.target.value.split(":");
                            const h = (tur === "kasa" ? (kasalar || []) : (bankalar || [])).find((x) => x.id === id);
                            setIslemForm({ ...islemForm, hesapSecim: e.target.value, tutar: h ? tahsilTutarOnerisi(h) : islemForm.tutar, kurGirdi: "" });
                          }}
                          style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                        >
                          <option value="">Seçin…</option>
                          {(kasalar || []).map((k) => <option key={k.id} value={`kasa:${k.id}`}>Kasa: {k.ad} ({k.paraBirimi || "TRY"})</option>)}
                          {(bankalar || []).map((b) => <option key={b.id} value={`banka:${b.id}`}>Banka: {b.ad} ({b.paraBirimi || "TRY"})</option>)}
                        </select>
                      ))}
                      {c.durum === "Tahsilde" && !tahsilBankasi && (
                        <span style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                          Çekin tahsile verildiği banka hesabı bulunamadı — paranın girdiği hesabı seçin.
                        </span>
                      )}
                    </label>
                  )}

                  {/* KUR ÇEVİRİCİ: ciroda cariye işlenecek tutar, tahsilde hesaba girecek tutar çekin
                      biriminden farklı olabilir. "Para olan her yerde" kuralı (kullanıcı, 6 Eylül). */}
                  {kurAlaniGoster && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                        {tanim.hesapGerekli ? "Hesaba girecek" : "Cariye işlenecek"}
                        <span style={{ display: "flex", gap: 4 }}>
                          <input
                            type="number" step="any" min="0"
                            value={islemForm.tutar}
                            onChange={(e) => setIslemForm({ ...islemForm, tutar: e.target.value, kurGirdi: "" })}
                            style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, width: 110, textAlign: "right" }}
                          />
                          {/* Tahsilde birim HESABIN birimi, seçilemez: başka bir birimde yazmak hesabın
                              bakiyesini bozardı. */}
                          {tanim.hesapGerekli ? (
                            <span className="mono" style={{ alignSelf: "center", fontSize: 12, fontWeight: 700 }}>{hedefPB}</span>
                          ) : (
                          <select
                            value={hedefPB}
                            onChange={(e) => {
                              const yeniSoru = kurSorusu(cekPB, e.target.value, kurlar);
                              const on = yeniSoru ? kurUygula(c.tutar, yeniSoru.onerilen, yeniSoru.bolme) : c.tutar;
                              setIslemForm({ ...islemForm, paraBirimi: e.target.value, tutar: on != null ? String(on) : String(c.tutar), kurGirdi: "" });
                            }}
                            style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                          >
                            {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                          </select>
                          )}
                        </span>
                      </label>
                      {soru && (
                        <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                          {`Kur (1 ${soru.a} = ? ${soru.b})`}
                          <input
                            type="number" step="any" min="0"
                            value={kurKutusu}
                            onChange={(e) => {
                              const yeniTutar = kurUygula(c.tutar, parseFloat(e.target.value), soru.bolme);
                              setIslemForm({ ...islemForm, kurGirdi: e.target.value, tutar: yeniTutar != null ? String(yeniTutar) : islemForm.tutar });
                            }}
                            style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12, width: 100 }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  <label style={{ display: "grid", gap: 3, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Not (opsiyonel)
                    <input
                      value={islemForm.not}
                      onChange={(e) => setIslemForm({ ...islemForm, not: e.target.value })}
                      style={{ padding: "6px 8px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                    />
                  </label>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      disabled={eksik}
                      style={{ padding: "6px 14px", fontSize: 12, opacity: eksik ? 0.5 : 1 }}
                      onClick={() => {
                        const banka = (bankalar || []).find((b) => b.id === islemForm.bankaId);
                        onIslem(c.id, secilenIslem, {
                          cariId: islemForm.cariId,
                          bankaId: islemForm.bankaId,
                          bankaAd: banka ? banka.ad : null,
                          hesapTur: hedefHesap ? hedefHesap.tur : null,
                          hesapId: hedefHesap ? hedefHesap.hesap.id : null,
                          tutar: parseFloat(islemForm.tutar) || c.tutar,
                          paraBirimi: hedefPB,
                          not: islemForm.not,
                        });
                        setIslemCek(null);
                      }}
                    >
                      {tanim.ad}
                    </button>
                    <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setSecilenIslem(null)}>
                      Geri
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

