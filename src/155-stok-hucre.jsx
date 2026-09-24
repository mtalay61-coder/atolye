// Miktar hücresi SALT OKUNURDUR. Eskiden tıklanınca miktar elle değiştirilebiliyordu; bu, hareket
// kaydı bırakmadan stoğu değiştirdiği için envanteri denetlenemez hale getiriyordu. Miktar artık
// yalnızca hareket (giriş/çıkış fişi, sipariş teslimi, üretim girişi) yoluyla değişir.
// Not: minimum stok ve rezerve gösterimi etkilenmez — ikisi de miktar değil, eşik/bilgi alanıdır.
function StokGirisHucre({ qty, low, minStok, onMinStokChange, rezerve, onGoToSiparis, onGoToUretim }) {
  const [minDuzenle, setMinDuzenle] = useState(false);
  const [minTaslak, setMinTaslak] = useState(String(minStok ?? 0));
  const [detayAcik, setDetayAcik] = useState(false);
  const rezDetay = (rezerve && rezerve.detay) || [];
  const rezToplam = (rezerve && rezerve.toplam) || 0;
  const musait = qty - rezToplam;

  function minKaydet() {
    onMinStokChange(parseFloat(minTaslak) || 0);
    setMinDuzenle(false);
  }
  return (
    <span style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span
        title={
          "Stok miktarı elle değiştirilemez — yalnızca hareketle (stok girişi, sipariş teslimi, üretim girişi) değişir." +
          (rezToplam > 0 ? ` · Gerçek: ${qty} — Rezerve: ${rezToplam} — Müsait: ${musait}` : "")
        }
        className="mono"
        style={{ fontWeight: 600, color: low ? "var(--erp-warn)" : "#221B14", minWidth: 24, textAlign: "center", cursor: "default" }}
      >
        {qty}
      </span>

      {rezToplam > 0 && (
        <button
          type="button"
          onClick={() => setDetayAcik((v) => !v)}
          className="mono"
          style={{ fontSize: 9, color: "#9C3D3D", fontWeight: 700, border: "none", background: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          title="Rezerve hangi sipariş/üretimden geliyor — görmek için tıklayın"
        >
          rez: {rezToplam}
        </button>
      )}
      {rezToplam > 0 && (
        <span className="mono" style={{ fontSize: 9, color: musait < 0 ? "var(--erp-warn)" : "var(--erp-primary)", fontWeight: 700 }}>
          müsait: {musait}
        </span>
      )}

      {detayAcik && rezDetay.length > 0 && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setDetayAcik(false)} />
          <div
            style={{
              position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, zIndex: 50,
              background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 8,
              minWidth: 160, boxShadow: "none",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 4, whiteSpace: "nowrap" }}>
              Rezerve kaynağı
            </div>
            <div style={{ display: "grid", gap: 3 }}>
              {rezDetay.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDetayAcik(false);
                    if (d.siparisId && onGoToSiparis) onGoToSiparis(d.siparisId);
                    else if (d.uretimId && onGoToUretim) onGoToUretim(d.uretimId);
                  }}
                  className="mono"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1,
                    fontSize: 11, fontWeight: 600,
                    border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)", padding: "3px 7px", background: "var(--erp-panel)",
                    color: "var(--erp-info)", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span>{d.siparisNo}</span>
                    <span>{d.miktar}</span>
                  </span>
                  {d.planlama && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#8A6A2E" }}>
                      {d.planlama.tip === "Satınalma" ? "Alış siparişi" : "Üretim"} planlandı: {d.planlama.referansNo}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {minDuzenle ? (
        <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <input
            autoFocus
            type="number" min="0"
            value={minTaslak}
            onChange={(e) => setMinTaslak(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && minKaydet()}
            onBlur={minKaydet}
            style={{ width: 32, fontSize: 9, padding: "1px 2px", border: "1px solid #E1611F", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => { setMinTaslak(String(minStok ?? 0)); setMinDuzenle(true); }}
          title="Bu renk/beden için min. stok eşiğini düzenle"
          className="mono"
          style={{
            border: "none", background: "none", cursor: "pointer", padding: 0,
            fontSize: 9, color: "var(--erp-text-3)", fontWeight: 600,
          }}
        >
          min: {minStok ?? 0}
        </button>
      )}
    </span>
  );
}

// EkFiyatEkleyici KALDIRILDI (kullanıcı, 18 Eylül: "P.birimi ekle'yi kaldır, fiyatlandırma
// seçeneğimiz var, oradan eklenebilir"). Ürün kartının üst satırında duran bu küçük ekleyici,
// Fiyatlandırma sekmesindeki tam fiyat düzenleyiciyle aynı işi yapıyordu — iki yol, biri eksik.

// Kayıtlı bir reçete grubunu (hammadde+renk) Stok kartındaki gibi açılır/kapanır tek satır olarak gösterir;
// tıklandığında satırın hemen altında kendi bağımsız düzenleme formu açılır.

// Stok listesinde tıklanınca ürünü ayrı bir pencerede (modal) açan kısa özet satırı.
function UrunOzetSatiri({ product, onAc, stokRezervasyonlari, tumSiparisler, ozelKodAlanlari }) {
  // ÖZEL KODLAR — dolu olanlar satırda rozet olarak. Alan adıyla birlikte yazılıyor
  // ("Taban: 147"): çıplak bir "147", listede hangi alana ait olduğunu söylemiyordu.
  const dolikodlar = ozelKodCiftleri(product, ozelKodAlanlari);
  // Listede iki sayı anlamlı: stoğun ne kadarı tutulmuş (rezerve) ve karşılanamayan talep (açık).
  // Açık, satın alınması gereken miktardır — "stokta var" görünen bir malzemede bile olabilir,
  // çünkü talep stoktan büyük olabilir.
  const rezOzet = (product.variants || []).reduce(
    (t, v) => {
      const k = rezervasyonKarsilama(product.id, v.renk, v.beden, tumSiparisler, stokRezervasyonlari, [product]);
      return { rezerve: t.rezerve + k.stoktanKarsilanan, acik: t.acik + k.acikToplam };
    },
    { rezerve: 0, acik: 0 }
  );
  const toplamRezerve = stokYuvarla(rezOzet.rezerve);
  const toplamAcik = stokYuvarla(rezOzet.acik);
  // Toplama sırasında da birikme olur; gösterilen değer ayrıca yuvarlanır.
  const total = stokYuvarla(product.variants.reduce((sum, v) => sum + v.miktar, 0));
  const kritik = product.variants.some((v) => v.miktar <= (v.minStok ?? 0));
  return (
    <button
      type="button"
      onClick={onAc}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14,
        // Kategori ayrımı satırın KENDİSİNDE: kalın sol kenar ve hafif zemin tonu.
        // Küçük bir ikon, uzun bir listede hızlı tararken yeterince ayırt edici değildi —
        // hammadde ile mamulü karıştırmak sipariş ve reçetede pahalı bir hata.
        background: alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-text-2)"), "0D"),
        border: `1px solid ${(CAT_COLORS[product.kategori] || "var(--erp-text-2)")}33`,
        borderLeft: `5px solid ${CAT_COLORS[product.kategori] || "var(--erp-text-2)"}`,
        borderRadius: "var(--erp-r-md)",
        cursor: "pointer", textAlign: "left",
      }}
    >
      {/* Görsel varsa görsel; yoksa kategori ikonu. Boş bir gri kare, satırın hiçbir şeyini
          anlatmıyordu — ikon en azından ürünün ne olduğunu söylüyor. */}
      {product.kapakResmi ? (
        <ColorSwatch src={product.kapakResmi} editable={false} size={40} />
      ) : (
        <div
          title={product.kategori}
          style={{
            width: 40, height: 40, borderRadius: "var(--erp-r-md)", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-text-2)"), "18"),
            border: `1px solid ${(CAT_COLORS[product.kategori] || "var(--erp-text-2)")}33`,
          }}
        >
          <KategoriIkonu kategori={product.kategori} size={19} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#3A291D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.ad}
        </div>
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Malzeme/mamul tipi rozeti: "Deri", "Ambalaj" gibi. Liste tek satırda çok az bilgi
              taşıyordu; tip, ürünü aramadan tanımanın en hızlı yolu. */}
          {(product.malzemeTipi || product.mamulTipi) && (
            <span
              className="mono"
              style={{
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                background: alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-text-2)"), "18"),
                color: CAT_COLORS[product.kategori] || "var(--erp-text-2)",
              }}
            >
              {product.malzemeTipi || product.mamulTipi}
            </span>
          )}
          <span>{product.variants.length} renk/beden</span>
          {dolikodlar.map((x) => (
            <span
              key={x.etiket}
              className="mono"
              title={`${x.etiket}: ${x.deger}`}
              style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A18", color: "var(--erp-info)" }}
            >
              {x.etiket}: {x.deger}
            </span>
          ))}
          {toplamRezerve > 0 && (
            <span
              className="mono"
              title="Stoğun bu kadarı siparişlere ayrılmış — serbest stok bundan azdır"
              style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#8A5A3818", color: "var(--erp-brown)" }}
            >
              {toplamRezerve} rezerve
            </span>
          )}
          {toplamAcik > 0 && (
            <span
              className="mono"
              title="Rezerve edilmiş ama stok ve yoldaki alışlarla karşılanamayan miktar — satın alınması gereken budur"
              style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E18", color: "var(--erp-warn)" }}
            >
              {toplamAcik} açık
            </span>
          )}
          {product.satisFiyati ? (
            <span>· {product.satisFiyati.toLocaleString("tr-TR")} {product.satisParaBirimi || "₺"}</span>
          ) : null}
          {product.pasif && (
            <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}>
              pasif
            </span>
          )}
        </div>
      </div>
      <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: kritik ? "var(--erp-warn)" : "#221B14" }}>
        {total}
      </span>
      {kritik && <AlertTriangle size={15} color="var(--erp-warn)" />}
      <ChevronRight size={18} color="var(--erp-text-3)" />
    </button>
  );
}

