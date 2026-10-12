// ================= WEB SİTESİ MÜŞTERİ ERİŞİMİ (v1.646.0) =================
//
// Kullanıcı: "Site için üyelik sistemi yapabilir miyiz? Herkes koleksiyonumuzu görmesin." · "Müşteri sipariş de
// verebilsin, ona özel fiyatlar ve modeller listelensin." Karar: müşteriye özel KOD (Supabase üyeliği değil — o hesap
// rls-kimlik.sql yüzünden ERP'nin bütün verisini okurdu; bkz. site-portal.sql başı).
//
// v1.649.0'dan beri kod değil KULLANICI ADI + ŞİFRE (aşağıda); pasif cari = erişim yok. Müşterinin gördüğü modeller: sitede işaretli VE bu cariye (cariye özel ya da fiyat
// grubu) fiyatı olan mamuller — fiyatı olmayan model o müşteriye görünmez.

// KULLANICI ADI + ŞİFRE (v1.649.0 — kullanıcı: "Müşteri giriş yaparken kullanıcı adı ve şifre ile girsin"). v1.646'daki
// tek kodun (`siteKodu`) yerini aldı. Hesap ERP'nin cari kaydında DEĞİL, Supabase'de ayrı tabloda (`site_hesaplari`,
// site-portal.sql §2/§10): cari kaydı her yazımda baştan gidiyor, şifre özeti orada ezilirdi; ayrıca şifre özeti
// ERP'nin yerel kopyasına/yedeğine hiç girmesin. Okuma/yazma yalnız fonksiyonlarla (site_hesap_bilgi / kaydet / sil);
// şifre bcrypt ile sunucuda özetlenir, geri okunamaz — bu yüzden "WhatsApp ile gönder" yalnız şifre YENİ
// belirlendiğinde (bu ekranda, kaydettikten hemen sonra) çıkar.

// Rastgele şifre: 8 karakter, karışan harfler (0/O, 1/I/L) yok; mod yanlılığı yok (248 = 31×8).
const SITE_SIFRE_ALFABESI = "abcdefghjkmnpqrstuvwxyz23456789";
function siteSifresiUret() {
  let s = "";
  while (s.length < 8) crypto.getRandomValues(new Uint8Array(16)).forEach((n) => { if (n < 248 && s.length < 8) s += SITE_SIFRE_ALFABESI[n % 31]; });
  return s;
}
// Ünvandan kullanıcı adı önerisi: "Ali Ayakkabı Ltd." → "ali.ayakkabi"
function siteKullaniciOner(unvan) {
  const tr = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return String(unvan || "").toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, (h) => tr[h])
    .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((k) => !["ltd", "sti", "as", "ve", "tic", "san"].includes(k)).slice(0, 2).join(".") || "musteri";
}

function SiteErisimPaneli({ cari, firmaBilgileri, onFieldChange, showToast, fiyatGrubuAdi }) {
  const [bilgi, setBilgi] = useState(undefined);      // undefined = okunuyor, null = hesap yok, {kullanici, sonGiris…}
  const [hata, setHata] = useState("");
  const [duzen, setDuzen] = useState(false);
  const [ad, setAd] = useState("");
  const [sifre, setSifre] = useState("");
  const [yeniGiris, setYeniGiris] = useState(null);   // {ad, sifre} — kaydedildiği an, gönderilsin diye
  const [mesgul, setMesgul] = useState(false);
  const oku = useCallback(() => {
    if (!supabaseAcikMi()) { setBilgi(null); return; }
    supabaseIstek("rpc/site_hesap_bilgi", { method: "POST", body: JSON.stringify({ p_cari_id: cari.id }) })
      .then((b) => { setBilgi(b || null); setHata(""); },
        (e) => { setBilgi(null); setHata(/site_hesap_bilgi|PGRST202|404/.test(String(e && e.message)) ? "Supabase'de site-portal.sql'in son hâli çalıştırılmamış." : String((e && e.message) || e)); });
  }, [cari.id]);
  useEffect(() => { oku(); }, [oku]);
  const ac = () => { setAd((bilgi && bilgi.kullanici) || siteKullaniciOner(cari.unvan)); setSifre(bilgi ? "" : siteSifresiUret()); setDuzen(true); setYeniGiris(null); };
  const kaydet = () => {
    setMesgul(true);
    supabaseIstek("rpc/site_hesap_kaydet", { method: "POST", body: JSON.stringify({ p_cari_id: cari.id, p_kullanici: ad, p_sifre: sifre }) })
      .then(() => {
        if (sifre) setYeniGiris({ ad: ad.trim().toLowerCase(), sifre });
        setDuzen(false); setMesgul(false); oku();
        if (showToast) showToast(sifre ? "Web sitesi girişi kaydedildi" : "Kullanıcı adı güncellendi");
      }, (e) => { setMesgul(false); const m = String((e && e.message) || e); if (showToast) showToast((m.match(/"message"\s*:\s*"([^"]+)"/) || [])[1] || m); });
  };
  const kapat = () => {
    if (!window.confirm(`${cari.unvan}: web sitesi girişi kapatılsın mı? Müşteri siteye giremez (açık oturumu da kapanır).`)) return;
    supabaseIstek("rpc/site_hesap_sil", { method: "POST", body: JSON.stringify({ p_cari_id: cari.id }) })
      .then(() => { setYeniGiris(null); oku(); if (showToast) showToast("Web sitesi erişimi kapatıldı"); }, (e) => showToast && showToast(String((e && e.message) || e)));
  };
  const site = String((firmaBilgileri && firmaBilgileri.website) || "").trim();
  const waAdres = yeniGiris ? (() => {
    const mesaj = `${site ? site + "\n" : ""}Koleksiyon, siparişleriniz ve hesabınız için giriş bilgileriniz:\nKullanıcı adı: ${yeniGiris.ad}\nŞifre: ${yeniGiris.sifre}`;
    const numara = whatsappNumarasi(cari.whatsapp || cari.telefon || "");
    return numara ? `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}` : `https://wa.me/?text=${encodeURIComponent(mesaj)}`;
  })() : null;
  const kucukDugme = { fontSize: 11, padding: "3px 8px" };
  return (
    <div data-site-erisim="1" style={{ marginBottom: 14, padding: "8px 10px", background: "#EEF3EC", borderRadius: "var(--erp-r-md)", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#2F6B3A", fontWeight: 700 }}>Web sitesi girişi:</span>
        {bilgi === undefined && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>okunuyor…</span>}
        {bilgi && !duzen && (
          <>
            <span className="mono" data-site-kullanici="1" style={{ fontSize: 13, fontWeight: 800, padding: "2px 8px", background: "#fff", border: "1px solid #BFD3BB", borderRadius: 6 }}>{bilgi.kullanici}</span>
            <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>{bilgi.sonGiris ? `son giriş ${String(bilgi.sonGiris).slice(0, 16).replace("T", " ")}` : "henüz giriş yapmadı"}{bilgi.kilitli ? " · çok hatalı deneme, 15 dk kilitli" : ""}</span>
            <button type="button" className="btn-secondary" style={kucukDugme} onClick={ac} data-site-hesap-duzenle="1">Kullanıcı adı / şifre değiştir</button>
            <button type="button" className="btn-secondary" style={{ ...kucukDugme, color: "var(--erp-danger)" }} onClick={kapat}>Erişimi kapat</button>
          </>
        )}
        {bilgi === null && !duzen && (
          <button type="button" className="btn-primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={ac} disabled={!!hata} data-site-hesap-ac="1">Giriş bilgisi oluştur</button>
        )}
        {bilgi !== undefined && !duzen && (bilgi || cari.siteDefter) && (
          // HESABIM'DA HANGİ DEFTER (v1.648.0 — kullanıcı kararı: "cariye göre seçilsin"). Cari alanı; boş = Genel.
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2F6B3A", fontWeight: 600 }}>
            Hesabında görünen defter
            <select value={cari.siteDefter || "Genel"} data-site-defter="1" onChange={(e) => onFieldChange(cari.id, "siteDefter", e.target.value === "Genel" ? undefined : e.target.value)}
              style={{ fontSize: 11, padding: "2px 4px", border: "1px solid #BFD3BB", borderRadius: 6 }}>
              <option value="Genel">Genel</option>
              <option value="Resmi">Resmi</option>
              <option value="Ikisi">Genel + Resmi (ayrı ayrı)</option>
            </select>
          </label>
        )}
      </div>
      {duzen && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 2, fontSize: 11, color: "#2F6B3A", fontWeight: 600 }}>Kullanıcı adı
            <input value={ad} data-site-kullanici-gir="1" onChange={(e) => setAd(e.target.value)} autoComplete="off" style={{ ...inputStyle, width: 170, padding: "4px 6px" }} />
          </label>
          <label style={{ display: "grid", gap: 2, fontSize: 11, color: "#2F6B3A", fontWeight: 600 }}>{bilgi ? "Yeni şifre (boş = değişmesin)" : "Şifre"}
            <span style={{ display: "flex", gap: 4 }}>
              <input value={sifre} data-site-sifre-gir="1" onChange={(e) => setSifre(e.target.value)} autoComplete="new-password" className="mono" style={{ ...inputStyle, width: 130, padding: "4px 6px" }} />
              <button type="button" className="btn-ghost" style={kucukDugme} onClick={() => setSifre(siteSifresiUret())} title="Rastgele şifre üret">↻</button>
            </span>
          </label>
          <button type="button" className="btn-primary" style={{ fontSize: 11, padding: "5px 12px" }} disabled={mesgul} onClick={kaydet} data-site-hesap-kaydet="1">Kaydet</button>
          <button type="button" className="btn-secondary" style={kucukDugme} onClick={() => setDuzen(false)}>Vazgeç</button>
        </div>
      )}
      {yeniGiris && (
        <div data-site-yeni-giris="1" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, background: "#fff", border: "1px dashed #BFD3BB", borderRadius: 6, padding: "5px 8px" }}>
          <span>Müşteriye iletin — kullanıcı adı <b className="mono">{yeniGiris.ad}</b>, şifre <b className="mono">{yeniGiris.sifre}</b></span>
          <a className="btn-secondary" style={{ ...kucukDugme, textDecoration: "none" }} href={waAdres} target="_blank" rel="noopener noreferrer">WhatsApp ile gönder</a>
          <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>Şifre bir daha gösterilmez (özeti saklanır); unutulursa yenisi verilir.</span>
        </div>
      )}
      {hata && <span style={{ fontSize: 11, color: "var(--erp-danger)" }}>{hata}</span>}
      <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
        {bilgi
          ? `Müşteri sitede bu bilgilerle girer: "Web sitesinde göster" işaretli ve ${fiyatGrubuAdi ? `"${fiyatGrubuAdi}" grubunda ya da` : ""} cariye özel fiyatı olan modelleri görür, sipariş talebi gönderir (Siparişler › Siteden gelenler); "Hesabım"da seçili defterin bakiyesini, ekstresini, siparişlerini ve çeklerini görür.`
          : "Giriş bilgisi olmayan müşteri sitedeki koleksiyonu ve hesabını göremez."}
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
