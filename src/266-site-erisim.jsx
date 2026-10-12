// ================= WEB SİTESİ MÜŞTERİ ERİŞİMİ (v1.646.0) =================
//
// Kullanıcı: "Site için üyelik sistemi yapabilir miyiz? Herkes koleksiyonumuzu görmesin." · "Müşteri sipariş de
// verebilsin, ona özel fiyatlar ve modeller listelensin." Karar: müşteriye özel KOD (Supabase üyeliği değil — o hesap
// rls-kimlik.sql yüzünden ERP'nin bütün verisini okurdu; bkz. site-portal.sql başı).
//
// Kod carinin `siteKodu` alanında (`ek`e gider, sütun gerekmez). Sitedeki `portal()` kodu bu alandan bulur; boş kod ya
// da pasif cari = erişim yok. Müşterinin gördüğü modeller: sitede işaretli VE bu cariye (cariye özel ya da fiyat
// grubu) fiyatı olan mamuller — fiyatı olmayan model o müşteriye görünmez.

// 10 karakter, karışan harfler (0/O, 1/I/L) yok: 31^10 ≈ 49 bit — tahminle bulunamaz, telefonda okunabilir.
const SITE_KOD_ALFABESI = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function siteKoduUret(mevcutKodlar) {
  const kume = new Set((mevcutKodlar || []).map((k) => String(k || "").toUpperCase()));
  for (let deneme = 0; deneme < 20; deneme++) {
    // 248 = 31×8: üstündeki baytlar atılır, her harf eşit olasılıkta kalsın (mod yanlılığı yok).
    let kod = "";
    while (kod.length < 10) {
      crypto.getRandomValues(new Uint8Array(16)).forEach((n) => { if (n < 248 && kod.length < 10) kod += SITE_KOD_ALFABESI[n % 31]; });
    }
    if (!kume.has(kod)) return kod;
  }
  return null;
}

function SiteErisimPaneli({ cari, tumCariler, firmaBilgileri, onFieldChange, showToast, fiyatGrubuAdi }) {
  const kod = cari.siteKodu || "";
  const site = String((firmaBilgileri && firmaBilgileri.website) || "").trim();
  const kodVer = () => {
    const yeni = siteKoduUret((tumCariler || []).map((c) => c.siteKodu).filter(Boolean));
    if (!yeni) return showToast && showToast("Kod üretilemedi, tekrar deneyin");
    onFieldChange(cari.id, "siteKodu", yeni);
    if (showToast) showToast(kod ? "Yeni kod verildi — eski kod artık çalışmaz" : "Web sitesi kodu verildi");
  };
  const kapat = () => { onFieldChange(cari.id, "siteKodu", undefined); if (showToast) showToast("Web sitesi erişimi kapatıldı"); };
  const kopyala = () => {
    try { navigator.clipboard.writeText(kod).then(() => showToast && showToast("Kod kopyalandı"), () => {}); } catch (e) { /* izin yok */ }
  };
  const mesaj = `${site ? site + " — " : ""}Koleksiyonumuzu görmek ve sipariş vermek için müşteri kodunuz: ${kod}`;
  const numara = whatsappNumarasi(cari.whatsapp || cari.telefon || "");
  const waAdres = numara ? `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}` : `https://wa.me/?text=${encodeURIComponent(mesaj)}`;
  return (
    <div data-site-erisim="1" style={{ marginBottom: 14, padding: "8px 10px", background: "#EEF3EC", borderRadius: "var(--erp-r-md)", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#2F6B3A", fontWeight: 700 }}>Web sitesi erişimi:</span>
        {kod ? (
          <>
            <span className="mono" data-site-kodu="1" style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", padding: "2px 8px", background: "#fff", border: "1px solid #BFD3BB", borderRadius: 6 }}>{kod}</span>
            <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={kopyala}>Kopyala</button>
            <a className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px", textDecoration: "none" }} href={waAdres} target="_blank" rel="noopener noreferrer">WhatsApp ile gönder</a>
            <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={kodVer} title="Eski kod çalışmaz olur">Yeni kod</button>
            <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px", color: "var(--erp-danger)" }} onClick={kapat}>Erişimi kapat</button>
          </>
        ) : (
          <button type="button" className="btn-primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={kodVer} data-site-kod-ver="1">Kod ver</button>
        )}
      </div>
      <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
        {kod
          ? `Müşteri bu kodla sitede, "Web sitesinde göster" işaretli ve ${fiyatGrubuAdi ? `"${fiyatGrubuAdi}" grubunda ya da` : ""} cariye özel fiyatı olan modelleri görür ve sipariş talebi gönderir (Siparişler › Siteden gelenler).`
          : "Kod verilmeyen müşteri sitedeki koleksiyonu göremez."}
      </span>
    </div>
  );
}

// ================= SİTEDEN GELEN SİPARİŞ TALEPLERİ =================
// Site `portal_siparis()` ile `site_talepleri` tablosuna yazar (fiyat sunucuda yeniden bulunur). Talep doğrudan sipariş
// OLMAZ (kullanıcı kararı): "Siparişe çevir" sipariş formunu doldurup açar, kullanıcı kontrol edip kaydeder; kaydedilen
// siparişin `siteTalepId`'si talebi listeden düşürür (ayrı bir "işlendi" yazımı gerekmez, yarım kalan çevirme talebi
// kaybettirmez). "Reddet" talebin durumunu yazar.
//
// Okuma doğrudan Supabase'den (talepler ERP'nin yerel kopyasına/yedeğine girmez — siteye ait, ERP verisi değil).
// Tablo yoksa (site-portal.sql çalıştırılmadıysa) panel hiç görünmez.
function siteTalepleriniOku() {
  return supabaseIstek("site_talepleri?select=*&durum=eq.yeni&order=olusturma.desc&limit=100");
}

function SiteTalepleriPaneli({ siparisler, cariler, onSipariseCevir, showToast }) {
  const [talepler, setTalepler] = useState(null);   // null = okunmadı / tablo yok
  const [acik, setAcik] = useState(true);
  const yenile = useCallback(() => {
    if (!supabaseAcikMi()) return;
    siteTalepleriniOku().then((l) => setTalepler(Array.isArray(l) ? l : []), () => setTalepler(null));
  }, []);
  useEffect(() => { yenile(); const t = setInterval(yenile, 120000); return () => clearInterval(t); }, [yenile]);
  const islenenler = React.useMemo(() => new Set((siparisler || []).map((s) => s.siteTalepId).filter(Boolean)), [siparisler]);
  const bekleyen = (talepler || []).filter((t) => !islenenler.has(t.id));
  if (!bekleyen.length) return null;
  const reddet = (t) => {
    if (!window.confirm(`${t.cari_unvan || "Müşteri"} talebi reddedilsin mi? (${t.toplam_cift} çift)`)) return;
    // Fonksiyonla (site-portal.sql): yalnız hâlâ 'yeni' olan talep reddedilir — iki cihaz aynı anda basarsa ikincisi boşa düşer.
    supabaseIstek("rpc/site_talep_reddet", { method: "POST", body: JSON.stringify({ p_id: t.id }) })
      .then(() => { setTalepler((l) => (l || []).filter((x) => x.id !== t.id)); if (showToast) showToast("Talep reddedildi"); },
        (e) => showToast && showToast("Reddedilemedi: " + ((e && e.message) || e)));
  };
  return (
    <div data-site-talepleri="1" style={{ margin: "0 0 12px", border: "1px solid #BFD3BB", background: "#F3F8F1", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>
      <button type="button" onClick={() => setAcik(!acik)} style={{ all: "unset", cursor: "pointer", fontWeight: 700, color: "#2F6B3A", fontSize: 13 }}>
        {acik ? "▾" : "▸"} Siteden gelen sipariş talepleri ({bekleyen.length})
      </button>
      {acik && (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {bekleyen.map((t) => {
            const cari = (cariler || []).find((c) => c.id === t.cari_id);
            const modeller = Array.from(new Set((t.kalemler || []).map((k) => `${k.urunAd} · ${k.renk}`)));
            return (
              <div key={t.id} data-site-talep={t.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", border: "1px solid #DCE7D8", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
                <span className="mono" style={{ color: "var(--erp-text-3)" }}>{String(t.olusturma || "").slice(0, 16).replace("T", " ")}</span>
                <b>{(cari && cari.unvan) || t.cari_unvan || "?"}</b>
                <span>{t.toplam_cift} çift</span>
                <span style={{ color: "var(--erp-text-2)", flex: "1 1 200px", minWidth: 0 }}>{modeller.join(", ")}{t.not_metni ? ` — “${t.not_metni}”` : ""}</span>
                <button type="button" className="btn-primary" style={{ fontSize: 11, padding: "3px 10px" }} disabled={!cari} title={cari ? "" : "Cari bulunamadı"} onClick={() => onSipariseCevir(t)}>Siparişe çevir</button>
                <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => reddet(t)}>Reddet</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
