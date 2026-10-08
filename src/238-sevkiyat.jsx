// JSX'E ÇEVRİLDİ (v1.542.0): v1.444.0'da yayındaki HTML'den derlenmiş hâliyle (React.createElement)
// geri çıkarılmıştı; okutma sonucu satırı eklenirken elle JSX'e döndürüldü, davranış aynı.
// ================= DEPO > SEVKİYAT (22 Eylül, v1.415.0) =================
//
// Kullanıcı: "depoya sevkiyat ekleyelim, depodan sevk etmek için, hem barkod okuyucuyu kullanarak,
// kolilenmiş ürünler vs okutarak sevk ederiz; sevkiyat logosu kamyonet olsun."
//
// BUGÜNE KADAR sevkiyat SİPARİŞTEN başlıyordu: sipariş kartı → fiş oluştur → koli barkodunu okut →
// kaydet. Depoda duran kişinin elinde ise sipariş değil KOLİ var. Bu ekran yönü tersine çeviriyor:
// koliyi okut, sipariş kendiliğinden bulunsun.
//
// STOK VE SİPARİŞ KAYITLARINI BU EKRAN YAZMIYOR. Okutulan koliler siparişe göre gruplanıp aynı
// kapıdan (`siparisGerceklestir`) geçiyor: fiş defteri, stok hareketi, cari hareketi, karşılanan
// sayacı ve kolinin "Sevk edildi" durumu hep o kapının işi. İkinci bir yazma yolu açmak, iki ayrı
// sevkiyat mantığı demekti (biri fişsiz sevk eder, fark aylar sonra denetimde çıkardı).
//
// KOLİ, SİPARİŞSİZ OLABİLİR (paketlemede sipariş seçilmeden kurulmuş). Böyle koli BU EKRANDAN sevk
// edilmiyor: hangi siparişin karşılandığı belli değilken fiş kesmek, karşılanan sayacını yanlış
// yere yazmak demek. Ekran bunu söylüyor ve koliyi ayrı başlıkta gösteriyor.
// GRUPLAMA CARİYE GÖRE (23 Eylül, v1.420.0 — kullanıcı: "koli okutulunca direkt cariyi seçsin;
// farklı müşterilerin kolileri varsa ayrı fişler atsın"). v1.415/416 siparişe göre gruplayıp
// siparişsiz koliyi reddediyordu; oysa koli cariyi ve üretimi taşıyor, sipariş oradan çözülüyor
// (237-koli-fis). Şimdi: her cari bir fiş; satırlar çözülen siparişe bağlı, çözülemeyen serbest.
function sevkiyatGruplari(okutulanIdler, koliler, siparisler, cariler, uretim, stok) {
  const gruplar = new Map();
  const carisizler = [];
  okutulanIdler.forEach((id) => {
    const koli = (koliler || []).find((k) => k.id === id);
    if (!koli || (koli.durum || "Hazır") === "Sevk edildi") return; // fişte kaydedildi → listeden düşer
    const cariId = koliCarisiniCoz(koli, siparisler, uretim);
    if (!cariId) { carisizler.push(koli); return; }
    if (!gruplar.has(cariId))
      gruplar.set(cariId, { cariId, cari: (cariler || []).find((c) => c.id === cariId), koliler: [], satirlar: [], uyarilar: [], siparisler: new Set() });
    const g = gruplar.get(cariId);
    const { satirlar, siparis, uyarilar } = koliKalemleriniFisSatirinaCevir(koli, { siparisler, uretim, stok, mevcutKalemler: g.satirlar });
    g.koliler.push(koli);
    g.satirlar.push(...satirlar);
    g.uyarilar.push(...uyarilar.map((u) => `${koli.kod}: ${u}`));
    if (siparis) g.siparisler.add(siparis.siparisNo);
  });
  return { gruplar: [...gruplar.values()], carisizler };
}

function SevkiyatEkrani({ koliler, siparisler, cariler, stok, tanimlar, uretim, onFisAc, showToast, onGoToSiparis }) {
  const [okutulan, setOkutulan] = useState([]); // koli id'leri, okutma sırasıyla
  const [sonGonderi, setSonGonderi] = useState(null);
  // SON OKUTMANIN SONUCU (v1.542.0 — kullanıcı: siparişte "titriyor ama eklemiyor, hatayı söylemiyor";
  // aynı düzeltme sevkiyata da istendi). Toast'a ek olarak kutunun altında kalıcı satır.
  const [okutmaSonucu, setOkutmaSonucu] = useState(null);
  const okut = useCallback((ham) => {
    const kod = String(ham || "").trim();
    if (!kod) return;
    const bildir = (metin, tamam) => {
      setOkutmaSonucu({ tamam, metin });
      showToast(metin);
      if (!tamam) okutmaHatasiTitret();
      okutmaSesi(!!tamam);   // v1.614.0: okutma sesi (sipariş formuyla aynı)
    };
    const koli = (koliler || []).find((k) => (k.kod || "").toLocaleUpperCase("tr") === kod.toLocaleUpperCase("tr"));
    if (!koli) {
      // Ürün etiketi okutulmuş olabilir: sebebini söyle, sessiz kalma. Harici (kutu/tedarikçi) barkodu da
      // ürün etiketi sayılır (v1.542.0).
      const urunMu = urunBarkoduCoz(kod, stok, tanimlar);
      bildir(urunMu
        ? "Bu bir ÜRÜN etiketi — sevkiyatta koli barkodu okutulur (Paketleme'de koli kurun ya da sipariş kartından fiş kesin)"
        : `Koli bulunamadı: ${kod}`, false);
      return;
    }
    if ((koli.durum || "Hazır") === "Sevk edildi") {
      bildir(`${koli.kod} zaten sevk edilmiş${koli.sevkFisNo ? ` (${koli.sevkFisNo})` : ""}`, false);
      return;
    }
    // Liste kontrolü güncelleyicinin DIŞINDA: güncelleyici içinde toast/titreşim yan etkisi olmasın
    // (React güncelleyiciyi iki kez çağırabilir).
    if (okutulan.includes(koli.id)) { bildir(`${koli.kod} zaten listede`, false); return; }
    setOkutulan((o) => (o.includes(koli.id) ? o : [...o, koli.id]));
    bildir(`${koli.kod} eklendi`, true);
  }, [koliler, stok, tanimlar, showToast, okutulan]);
  const { gruplar, carisizler } = sevkiyatGruplari(okutulan, koliler, siparisler, cariler, uretim, stok);
  const toplamCift = gruplar.reduce((t, g) => t + g.satirlar.reduce((x, s) => x + s.miktar, 0), 0);
  // KÖPRÜ (23 Eylül, v1.422.0 — kullanıcı: "satış ekranı tek olsun; depodan da siparişten de
  // cariden de satış deyince tek ekran açılsın, farklı yerler yalnız köprü olsun"). Bu ekran artık
  // fiş KAYDETMİYOR: okutulan kolilerin satırlarıyla cari SATIŞ FİŞİ penceresini açıyor
  // (`stokFisiAc`, cari kartındaki "Satış Fişi" ile aynı pencere, aynı kayıt kapısı). Kullanıcı
  // fiyat, ödeme, peşin, açıklama gibi alanları orada görüp kaydediyor. Koli listeden pencere
  // açılınca düşer; fiş kaydedilmezse koli "Hazır" kaldığı için yeniden okutulabilir.
  const grubuFiseTasi = (g) => {
    if (!g.satirlar.length) return showToast("Sevk edilecek satır yok");
    onFisAc(g.cariId, "Satış", (g.cari && g.cari.unvan) || "", g.satirlar);
    const idler = g.koliler.map((k) => k.id);
    setOkutulan((o) => o.filter((id) => !idler.includes(id)));
    setSonGonderi({ cari: (g.cari && g.cari.unvan) || "—", koli: g.koliler.length, cift: g.satirlar.reduce((x, s) => x + s.miktar, 0) });
  };
  const hepsiniSevkEt = () => {
    gruplar.forEach(grubuFiseTasi); // her cari kendi fiş penceresini alır
  };
  const sayi = (n) => stokYuvarla(n || 0).toLocaleString("tr-TR");
  const th = (align) => ({ textAlign: align, padding: "2px 6px" });
  return (
    <div data-sevkiyat="1" style={{ display: "grid", gap: 12, maxWidth: 900 }}>
      <KameraOkuyucu onKod={okut} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <BarkodGirdisi onKod={okut} placeholder="Koli barkodu okutun ya da yazın" ikon={Truck} veriAdi="data-sevk-girdi" />
        {okutulan.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
              <b>{okutulan.length}</b> koli · <b>{sayi(toplamCift)}</b> çift
            </span>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setOkutulan([])}>Listeyi temizle</button>
            {gruplar.length > 1 && (
              <button type="button" className="btn-primary" data-sevk-hepsi="1" style={{ padding: "5px 12px", fontSize: 12 }} onClick={hepsiniSevkEt}>
                <Truck size={13} /> Hepsinin fişini aç ({gruplar.length} cari)
              </button>
            )}
          </>
        )}
        <OkutmaSonucu sonuc={okutmaSonucu} onKapat={() => setOkutmaSonucu(null)} />
      </div>
      {sonGonderi && (
        <div data-sevk-sonuc="1" style={{ fontSize: 12, padding: 8, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)" }}>
          <b>{sonGonderi.cari}</b> için satış fişi açıldı · {sonGonderi.koli} koli · {sayi(sonGonderi.cift)} çift. Fişi kontrol edip kaydedin; kaydedilmezse koliler "Hazır" kalır, yeniden okutabilirsiniz.
        </div>
      )}
      {gruplar.map((g) => {
        const grupCift = g.satirlar.reduce((x, s) => x + s.miktar, 0);
        const bagli = g.satirlar.filter((s) => s.kalemId).length;
        const cariAd = (g.cari && g.cari.unvan) || g.cariId;
        return (
          <div key={g.cariId} data-sevk-grup={cariAd} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{(g.cari && g.cari.unvan) || "—"}</b>
              {[...g.siparisler].map((no) => <span key={no} className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{no}</span>)}
              <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                {g.koliler.length} koli · {sayi(grupCift)} çift · {bagli}/{g.satirlar.length} satır siparişe bağlı
              </span>
              <button type="button" className="btn-primary" data-sevk-et={cariAd} style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }} onClick={() => grubuFiseTasi(g)}>
                <Truck size={13} /> Satış fişini aç
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Koliler: {g.koliler.map((k) => k.kod).join(", ")}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
                    <th style={th("left")}>KOLİ</th>
                    <th style={th("left")}>ÜRÜN</th>
                    <th style={th("left")}>RENK</th>
                    <th style={th("left")}>BEDEN</th>
                    <th style={th("right")}>SEVK</th>
                    <th style={th("left")}>SİPARİŞ</th>
                  </tr>
                </thead>
                <tbody>
                  {g.satirlar.map((s) => (
                    <tr key={s.id} data-sevk-satir={`${s.koliKod}|${s.beden}`} style={{ borderTop: "1px solid #F0E8D8" }}>
                      <td className="mono" style={{ padding: "3px 6px", fontSize: 11 }}>{s.koliKod}</td>
                      <td style={{ padding: "3px 6px", fontSize: 12 }}>{s.urunAd}</td>
                      <td style={{ padding: "3px 6px", fontSize: 12 }}>{s.renk}</td>
                      <td style={{ padding: "3px 6px", fontSize: 12 }}>{s.beden}</td>
                      <td className="mono" style={{ padding: "3px 6px", fontSize: 12, textAlign: "right", fontWeight: 700 }}>{sayi(s.miktar)}</td>
                      <td className="mono" style={{ padding: "3px 6px", fontSize: 11, color: s.siparis ? "var(--erp-text-2)" : "var(--erp-warn)" }}>{s.siparis ? s.siparis.siparisNo : "serbest"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {g.uyarilar.length > 0 && <div style={{ fontSize: 11, color: "var(--erp-warn)" }}>⚠ {g.uyarilar.join(" · ")}</div>}
          </div>
        );
      })}
      {carisizler.length > 0 && (
        <div data-sevk-carisiz="1" style={{ border: "1px solid #E4B8A8", background: "#FBEFEA", borderRadius: "var(--erp-r-md)", padding: 10, fontSize: 12 }}>
          <b>Carisi belli olmayan koliler:</b> {carisizler.map((k) => k.kod).join(", ")}. Kolide ne müşteri ne sipariş ne üretim bağı var. Cari kartından satış fişi açıp orada okutun (koli o cariye yazılır) ya da Paketleme'de koliyi bağlayın.
          {carisizler.map((k) => (
            <button key={k.id} type="button" className="btn-ghost" style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11 }} onClick={() => setOkutulan((o) => o.filter((x) => x !== k.id))}>
              {k.kod} listeden çıkar
            </button>
          ))}
        </div>
      )}
      {okutulan.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
          Sevk edilecek kolileri okutun. Koliler müşterisine göre gruplanır; her müşteri için ayrı satış fişi kesilir. Satırlar kolinin siparişine bağlanır (koli › üretim › sipariş); sipariş bulunamazsa serbest yazılır. "Satış fişini aç" cari kartındaki satış fişi penceresini açar — kayıt orada, tek yerden.
        </div>
      )}
    </div>
  );
}
