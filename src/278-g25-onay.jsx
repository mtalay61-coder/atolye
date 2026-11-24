// ================= G-25 — PARA YETKİSİ, MESAİ BİLDİRİMİ, ÜCRET / TAMİR ONAYI (v1.745.0) =================
//
// Sunucu kuralı (stok-v2/guvenlik/25-G25-TASARIM.md): cari hareketi yazan PARA fişleri (tahsilat, ödeme, cari virmanı, maaş / mesai
// tahakkuku, ürünsüz alış / satış, demirbaş…) ve personel ücreti (maaş, aylık saat, mesai katı) CARİ veya MUHASEBE kaydetme yetkisi
// ister. Üretim kullanıcısı MİKTARI girer (mesai saati, teslim, tamir talebi); PARAYI cari / muhasebe yetkilisi belirler ya da onaylar:
//   • mesai: Üretim › Mesai bildirimi (mesai_bildir — saat; tutar gösterilmez) → yetkili Onaylar › Mesai (mesai_onayla — tek MS fişi)
//   • işçilik ücreti: ürünün proses ücreti, ara proses carisi / ücreti, numune ücreti, tamir ücreti ve "hem müşteri hem tedarikçi"
//     kartın işçilik alıcısı olması ONAYLANIR (ucret_onayla). Değer onaydan sonra değişirse onay geçersiz olur; teslim işçiliği yalnız
//     onaylı ücretle yazılır (sunucu reddeder — ret iletisi teslim ekranında görünür).
// Bu dosya istemci aynasıdır (K6): yetkisiz düğme kapalı ve gerekçeli; asıl koruma sunucuda. Sunucu reddi KALICI olarak ilgili düğmenin
// yanında yazılır (yalnız kısa süreli bildirim değil — 1.744.36'da ret iletisi birkaç saniyede kayboluyordu, ekran ölçümü).

// YETKİ AYNASI — App her çizimde kendi `kullaniciYetkisiVar`ını bağlar (094 yetkiVarMi; giriş kapalıysa herkes yetkili, sunucu da öyle).
let _g25YetkiKontrol = null;
function g25YetkiBagla(f) { _g25YetkiKontrol = typeof f === "function" ? f : null; }
function g25Yetki(modul, islem) { return !_g25YetkiKontrol || !!_g25YetkiKontrol(modul, islem); }
// PARA grubu: cari VEYA muhasebe kaydetme (K1). Yalnız fişler kaydetme yetmez.
function paraYetkisiVar() { return g25Yetki("cari", "kaydetme") || g25Yetki("muhasebe", "kaydetme"); }
// Mesai saati bildirimi: üretim (ya da PARA) kaydetme — sunucu mesai_bildir ile aynı liste.
function mesaiBildirmeYetkisiVar() { return g25Yetki("uretim", "kaydetme") || paraYetkisiVar(); }
const PARA_YETKI_METNI = "Bu işlem için cari veya muhasebe kaydetme yetkisi gerekir";
// Son para fişi reddinin metni — App paraFisiKes yazar; ekranlar (personel paneli…) kalıcı ret satırında gösterir.
let _g25SonParaHata = "";
function g25SonParaHatasiYaz(m) { _g25SonParaHata = m || ""; }
function g25SonParaHatasi() { return _g25SonParaHata; }

// SUNUCU İLETİSİ — "Supabase 400: {"code":"22023","message":"…"}" → "…". Ret kodu sonda (KR014 / KR015 / 42501 …) kalır.
function sunucuHataMetni(e) {
  let m = String((e && e.message) || e || "").replace(/^Supabase \d+:\s*/, "");
  const j = m.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (j) { try { m = JSON.parse(`"${j[1]}"`); } catch (x) { m = j[1]; } }
  return m.replace(/\s+/g, " ").trim().slice(0, 300);
}
async function g25Rpc(ad, p) {
  return supabaseIstek(`rpc/${ad}`, { method: "POST", body: JSON.stringify({ p: p || {} }) });
}
function buAy() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function ayAdi(ay) { try { return new Date(`${ay}-01T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); } catch (e) { return ay; } }
function bolumPersonelleri(tanimlar) {
  return ((tanimlar && tanimlar.bolumler) || []).flatMap((b) => (b.personel || []).filter((p) => p && p.cariId).map((p) => ({ cariId: p.cariId, bolum: b })));
}
const g25Kutu = { border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, margin: "10px 0", background: "#fff" };
const g25Ret = { fontSize: 12, color: "var(--erp-danger, #B42318)", marginTop: 4 };

// MESAİ HAREKETİ — 272 PersonelBilgileriPaneli'nin MS satırıyla aynı biçim; tutar SUNUCUNUN hesapladığı (bildirimdeki saatlerden).
function mesaiHareketi(bildirim, tanimlar) {
  const ay = bildirim.ay;
  const kayit = personelBolumKaydi(tanimlar, bildirim.cariId);
  const bolum = kayit && kayit.bolum;
  const s = bildirim.saatler || {};
  const sonGun = new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)), 0).getDate();
  return { tarih: `${ay}-${String(sonGun).padStart(2, "0")}`, yon: hareketYonu("Maaş"), tutar: Number(bildirim.hesaplananTutar) || 0, paraBirimi: "TRY",
    odemeSekli: "Nakit", vade: "", defter: iscilikDefteri(tanimlar && tanimlar.firmaBilgileri), mesaiAnahtari: bildirim.anahtar,
    bolumId: bolum ? bolum.id : null, giderKartId: bolum ? (bolumGiderKarti(tanimlar, bolum) || {}).id : null,
    aciklama: `${bolum ? bolum.ad : "Bölüm"} — ${ayAdi(ay)} mesaisi: hafta içi ${Number(s.haftaIci) || 0} s, Cmt ${Number(s.cumartesi) || 0} s, Pzr ${Number(s.pazar) || 0} s (bildirim onayı)`,
    mesaiSaatleri: { haftaIci: Number(s.haftaIci) || 0, cumartesi: Number(s.cumartesi) || 0, pazar: Number(s.pazar) || 0 } };
}

// MESAİ ONAY YÜKÜ (adlı kapı — kapidenetim.js IZINLI_YAZICILAR): onaylanan bildirimin MS fiş yükü. Hareketi yerelde YAZMAZ;
// sunucu (mesai_onayla) tutarı saatlerden yeniden hesaplar, anahtarı kendi koyar, fişi tek işlemde keser. Yerel kayıt cari tazelemeyle gelir.
function mesaiOnayYukuKur(b, tanimlar, kullaniciAd) {
  const h = paraFisiYuku({ fis: { tur: "Mesai", onek: paraFisOneki("Mesai"), kaynak: "Mesai", ek: { mesaiAnahtari: b.anahtar } },
    cariId: b.cariId, hareketler: [mesaiHareketi(b, tanimlar)], istek: uid("fis"), zaman: new Date().toISOString(), kullaniciAd });
  return { ...h.yuk, istemci: fisIstemciBilgisi() };
}

// ÜRETİM › MESAİ BİLDİRİMİ — bölüm personeline ay ay saat. Para yok; onaylanmış ay değişmez (sunucu KR014).
function MesaiBildirimPaneli({ tanimlar, cariler }) {
  const [ay, setAy] = useState(buAy());
  const [liste, setListe] = useState(null);
  const [saat, setSaat] = useState({});
  const [hata, setHata] = useState({});
  const [genelHata, setGenelHata] = useState("");
  const [suruyor, setSuruyor] = useState(null);
  const yetkili = mesaiBildirmeYetkisiVar();
  const personel = bolumPersonelleri(tanimlar);
  const yukle = useCallback(async () => {
    setGenelHata("");
    try { const r = await g25Rpc("mesai_bildirimleri", { ay }); setListe(Array.isArray(r) ? r : []); }
    catch (e) { setListe([]); setGenelHata(sunucuHataMetni(e)); }
  }, [ay]);
  useEffect(() => { yukle(); }, [yukle]);
  const bildirimi = (cariId) => (liste || []).find((b) => b.cariId === cariId && b.durum !== "iptal");
  const bildir = async (cariId) => {
    const g = saat[cariId] || {};
    setSuruyor(cariId); setHata((h) => ({ ...h, [cariId]: "" }));
    try {
      await g25Rpc("mesai_bildir", { cariId, ay, saatler: { haftaIci: Number(g.haftaIci) || 0, cumartesi: Number(g.cumartesi) || 0, pazar: Number(g.pazar) || 0 } });
      setSaat((s) => ({ ...s, [cariId]: undefined }));
      await yukle();
    } catch (e) { setHata((h) => ({ ...h, [cariId]: `Bildirilemedi: ${sunucuHataMetni(e)}` })); }
    finally { setSuruyor(null); }
  };
  const kutu = { ...inputStyle, width: 80, fontSize: 13 };
  return (
    <div data-mesai-bildirim-paneli style={g25Kutu}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Mesai bildirimi <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>
          saat girilir — tutarı cari / muhasebe yetkilisi onaylar</span></div>
        <Field label="Ay"><input data-mesai-bildirim-ay type="month" value={ay} onChange={(e) => setAy(e.target.value)} style={{ ...kutu, width: 150 }} /></Field>
      </div>
      {!yetkili && <div data-mesai-bildirim-yetkisiz style={g25Ret}>Mesai bildirmek için üretim (ya da cari / muhasebe) kaydetme yetkisi gerekir.</div>}
      {genelHata && <div style={g25Ret}>{genelHata}</div>}
      {personel.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Bölüm personeli yok (Tanımlar › Atölye İçi Bölümler).</div>}
      {personel.map(({ cariId, bolum }) => {
        const c = (cariler || []).find((x) => x.id === cariId);
        const b = bildirimi(cariId);
        const kilitli = !yetkili || (b && b.durum === "onaylandi") || suruyor === cariId;
        const g = saat[cariId] || (b ? b.saatler : {}) || {};
        return (
          <div key={cariId} data-mesai-bildirim-satir={cariId} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--erp-line-soft)" }}>
            <div style={{ minWidth: 170, fontSize: 13 }}><b>{c ? c.unvan : cariId}</b><div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{bolum.ad}</div></div>
            {[["haftaIci", "Hafta içi"], ["cumartesi", "Cumartesi"], ["pazar", "Pazar"]].map(([k, et]) => (
              <label key={k} style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{et}<br />
                <input data-mesai-bildirim-saat={k} type="number" min="0" step="0.5" disabled={kilitli} value={g[k] ?? ""} style={kutu}
                  onChange={(e) => setSaat((s) => ({ ...s, [cariId]: { ...(s[cariId] || (b ? b.saatler : {}) || {}), [k]: e.target.value } }))} />
              </label>
            ))}
            <span data-mesai-bildirim-durum={b ? b.durum : "yok"} style={{ fontSize: 12 }}>
              {b ? (b.durum === "onaylandi" ? `onaylandı${b.fisNo ? ` · ${b.fisNo}` : ""}` : "onay bekliyor") : "bildirilmedi"}
              {b && b.hesaplananTutar != null ? ` · ${Number(b.hesaplananTutar).toLocaleString("tr-TR")} ₺` : ""}
            </span>
            <button type="button" className="btn-primary" data-mesai-bildir={cariId} disabled={kilitli || !saat[cariId]}
              title={!yetkili ? "Üretim kaydetme yetkisi gerekir" : (b && b.durum === "onaylandi" ? "Bu ayın mesaisi onaylandı — değiştirilemez" : "")}
              onClick={() => bildir(cariId)}>{b && b.durum === "bekliyor" ? "Güncelle" : "Bildir"}</button>
            {hata[cariId] && <div data-mesai-bildirim-hata={cariId} style={{ ...g25Ret, flexBasis: "100%" }}>{hata[cariId]}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ÜCRET ONAY DURUMU (salt okur, Üretim'de herkese): onay bekleyen ücretler — teslim neden reddedildi sorusunun cevabı.
function UcretOnayDurumu({ yenile }) {
  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState("");
  useEffect(() => { (async () => {
    try { const r = await g25Rpc("ucret_onaylari", { kapsam: "acik" }); setListe((Array.isArray(r) ? r : []).filter((x) => !x.onayli)); setHata(""); }
    catch (e) { setListe([]); setHata(sunucuHataMetni(e)); }
  })(); }, [yenile]);
  if (!liste) return null;
  return (
    <div data-ucret-onay-durumu={liste.length} style={g25Kutu}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Onay bekleyen ücretler {liste.length ? `(${liste.length})` : ""}
        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}> — onaylanmamış ücretle teslimde işçilik yazılmaz; cari / muhasebe yetkilisi Onaylar'dan onaylar</span></div>
      {hata && <div style={g25Ret}>{hata}</div>}
      {!liste.length && !hata && <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Açık üretimlerin bütün ücretleri onaylı.</div>}
      {liste.slice(0, 40).map((x) => <div key={x.anahtar} data-ucret-onay-bekleyen={x.anahtar} style={{ fontSize: 12, padding: "2px 0" }}>{ucretKalemiMetni(x)}</div>)}
    </div>
  );
}
function ucretKalemiMetni(x) {
  const g = x.guncel || {};
  const tl = (v) => `${Number(v || 0).toLocaleString("tr-TR")} ₺`;
  if (x.tur === "proses") return `${x.urunAd || x.urunId} · ${x.proses} ücreti ${tl(g.ucret)}`;
  if (x.tur === "numune") return `Numune ${x.siparisNo || x.uretimId} · ${x.proses} ücreti ${tl(g.ucret)}`;
  if (x.tur === "ara") return `${x.urunAd || x.urunId} · ara proses ${x.proses}: ${g.cari} carisine ${tl(g.ucret)}`;
  if (x.tur === "tamir") return `Tamir · ${x.siparisNo || x.uretimId} · ${x.proses} · ${g.miktar} adet × ${tl(g.ucret)} (personel ${g.personel})`;
  if (x.tur === "cari") return `İşçilik alıcısı: ${g.cari} (hem müşteri hem tedarikçi)`;
  return x.anahtar;
}

// ONAYLAR (cari / muhasebe kaydetme) — mesai bildirimleri + ücret / tamir onayları. Onay, EKRANDA görülen değerle gider; arada
// değer değiştiyse sunucu reddeder (KR015) ve liste yenilenir.
function OnayMerkezi({ tanimlar, cariler, onKapat, onCarilerTazele, kullaniciAd, showToast }) {
  const [sekme, setSekme] = useState("mesai");
  const [mesai, setMesai] = useState(null);
  const [ucret, setUcret] = useState(null);
  const [kapsam, setKapsam] = useState("acik");
  const [secili, setSecili] = useState({});
  const [tamirUcret, setTamirUcret] = useState({});
  const [hata, setHata] = useState({});
  const [suruyor, setSuruyor] = useState(false);
  const yetkili = paraYetkisiVar();
  const unvan = (id) => { const c = (cariler || []).find((x) => x.id === id); return c ? c.unvan : id; };
  const yukle = useCallback(async () => {
    const k = kapsam;   // bekleme öncesi (denetim 18)
    try { const r = await g25Rpc("mesai_bildirimleri", { durum: "bekliyor" }); setMesai(Array.isArray(r) ? r : []); }
    catch (e) { setMesai([]); setHata((h) => ({ ...h, mesai: sunucuHataMetni(e) })); }
    try { const r = await g25Rpc("ucret_onaylari", { kapsam: k }); setUcret(Array.isArray(r) ? r : []); }
    catch (e) { setUcret([]); setHata((h) => ({ ...h, ucret: sunucuHataMetni(e) })); }
  }, [kapsam]);
  useEffect(() => { yukle(); }, [yukle]);
  const mesaiOnayla = async (b) => {
    setSuruyor(true); setHata((h) => ({ ...h, [b.id]: "" }));
    try {
      const r = await g25Rpc("mesai_onayla", { bildirimId: b.id, fis: mesaiOnayYukuKur(b, tanimlar, kullaniciAd) });
      if (showToast) showToast(r && r.zatenVar ? `${unvan(b.cariId)} · ${ayAdi(b.ay)} mesaisi zaten onaylanmış (${r.fisNo})` : `Mesai onaylandı — ${r && r.fisNo}`);
      if (onCarilerTazele) onCarilerTazele();
      await yukle();
    } catch (e) { setHata((x) => ({ ...x, [b.id]: `Onaylanamadı: ${sunucuHataMetni(e)}` })); }
    finally { setSuruyor(false); }
  };
  const ucretOnayla = async () => {
    const kalemler = (ucret || []).filter((x) => secili[x.anahtar]).map((x) => {
      const yeni = x.tur === "tamir" && tamirUcret[x.anahtar] !== undefined && tamirUcret[x.anahtar] !== "" ? Number(String(tamirUcret[x.anahtar]).replace(",", ".")) : undefined;
      return { anahtar: x.anahtar, ozet: x.guncel, ...(yeni !== undefined ? { yeniUcret: yeni } : {}) };
    });
    if (!kalemler.length) return;
    setSuruyor(true); setHata((h) => ({ ...h, ucret: "" }));
    try {
      const r = await g25Rpc("ucret_onayla", { kalemler });
      if (showToast) showToast(`${((r && r.onaylanan) || []).length} ücret onaylandı`);
      setSecili({}); setTamirUcret({});
      await yukle();
    } catch (e) { setHata((h) => ({ ...h, ucret: `Onaylanamadı (hiçbiri kaydedilmedi): ${sunucuHataMetni(e)}` })); await yukle(); }
    finally { setSuruyor(false); }
  };
  const sekmeDugme = (k, et) => (
    <button type="button" data-onay-sekme={k} className={sekme === k ? "btn-primary" : "btn-ghost"} onClick={() => setSekme(k)} style={{ padding: "4px 12px", fontSize: 13 }}>{et}</button>);
  return (
    <div data-onay-merkezi style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 900, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: 16 }}>
      <div style={{ ...g25Kutu, width: "min(900px, 100%)", margin: "40px 0" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 15, flex: "1 1 auto" }}>Onaylar</b>
          {sekmeDugme("mesai", `Mesai${mesai ? ` (${mesai.length})` : ""}`)}
          {sekmeDugme("ucret", `Ücretler${ucret ? ` (${ucret.filter((x) => !x.onayli).length})` : ""}`)}
          <button type="button" className="btn-ghost" data-onay-kapat onClick={onKapat}>Kapat</button>
        </div>
        {!yetkili && <div style={g25Ret}>{PARA_YETKI_METNI} — liste yalnız görüntülenir.</div>}
        {sekme === "mesai" && (
          <div>
            {hata.mesai && <div style={g25Ret}>{hata.mesai}</div>}
            {mesai && !mesai.length && <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Onay bekleyen mesai bildirimi yok.</div>}
            {(mesai || []).map((b) => (
              <div key={b.id} data-onay-mesai={b.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--erp-line-soft)" }}>
                <span style={{ minWidth: 200 }}><b>{unvan(b.cariId)}</b> · {ayAdi(b.ay)}</span>
                <span style={{ fontSize: 12 }}>hafta içi {b.saatler.haftaIci} s · Cmt {b.saatler.cumartesi} s · Pzr {b.saatler.pazar} s</span>
                <b data-onay-mesai-tutar>{b.hesaplananTutar != null ? `${Number(b.hesaplananTutar).toLocaleString("tr-TR")} ₺` : "tutar hesaplanamadı (maaş yok)"}</b>
                <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>giren {b.giren}</span>
                <button type="button" className="btn-primary" data-onay-mesai-onayla={b.id} disabled={!yetkili || suruyor || b.hesaplananTutar == null}
                  title={!yetkili ? PARA_YETKI_METNI : ""} onClick={() => mesaiOnayla(b)}>Onayla</button>
                {hata[b.id] && <div data-onay-mesai-hata={b.id} style={{ ...g25Ret, flexBasis: "100%" }}>{hata[b.id]}</div>}
              </div>
            ))}
          </div>
        )}
        {sekme === "ucret" && (
          <div>
            <label style={{ fontSize: 12 }}><input type="checkbox" data-onay-kapsam-tum checked={kapsam === "tum"} onChange={(e) => setKapsam(e.target.checked ? "tum" : "acik")} />
              {" "}bütün ürünlerin ücretleri (ilk toplu onay için)</label>
            {hata.ucret && <div data-onay-ucret-hata style={g25Ret}>{hata.ucret}</div>}
            {(ucret || []).map((x) => (
              <div key={x.anahtar} data-onay-ucret={x.anahtar} data-onayli={x.onayli ? "1" : "0"} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid var(--erp-line-soft)", opacity: x.onayli ? 0.6 : 1 }}>
                <input type="checkbox" data-onay-ucret-sec={x.anahtar} disabled={!yetkili || (x.onayli && !(x.tur === "tamir" && tamirUcret[x.anahtar]))} checked={!!secili[x.anahtar]}
                  onChange={(e) => setSecili((s) => ({ ...s, [x.anahtar]: e.target.checked }))} />
                <span style={{ fontSize: 13, flex: "1 1 320px" }}>{ucretKalemiMetni(x)}{x.tur === "cari" || x.tur === "ara" ? ` (${unvan((x.guncel || {}).cari)})` : ""}
                  {x.tur === "tamir" ? ` (${unvan((x.guncel || {}).personel)})` : ""}</span>
                {x.tur === "tamir" && (
                  <input data-onay-tamir-ucret={x.anahtar} type="text" inputMode="decimal" placeholder="ücret belirle" disabled={!yetkili} value={tamirUcret[x.anahtar] ?? ""}
                    onChange={(e) => { setTamirUcret((t) => ({ ...t, [x.anahtar]: e.target.value })); setSecili((s) => ({ ...s, [x.anahtar]: true })); }} style={{ ...inputStyle, width: 100, fontSize: 12 }} />
                )}
                <span style={{ fontSize: 11, color: x.onayli ? "var(--erp-text-2)" : "var(--erp-warn)" }}>
                  {x.onayli ? `onaylı (${x.onaylayan})` : (x.onaylanan ? "DEĞİŞTİ — yeniden onay gerekir" : "onay bekliyor")}</span>
              </div>
            ))}
            <button type="button" className="btn-primary" data-onay-ucret-onayla disabled={!yetkili || suruyor || !Object.values(secili).some(Boolean)}
              title={!yetkili ? PARA_YETKI_METNI : ""} onClick={ucretOnayla} style={{ marginTop: 10 }}>Seçilenleri onayla</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ONAY BEKLİYOR ŞERİDİ (yalnız cari / muhasebe kaydetme yetkilisi): açılışta ve Onaylar kapanınca sayar.
function OnayBekleyenSeridi({ onAc, yenile }) {
  const [sayi, setSayi] = useState(null);
  useEffect(() => { if (!paraYetkisiVar()) return; (async () => {
    try {
      const [m, u] = await Promise.all([g25Rpc("mesai_bildirimleri", { durum: "bekliyor" }), g25Rpc("ucret_onaylari", { kapsam: "acik" })]);
      setSayi({ mesai: (m || []).length, ucret: (u || []).filter((x) => !x.onayli).length });
    } catch (e) { setSayi(null); }
  })(); }, [yenile]);
  if (!paraYetkisiVar() || !sayi || (!sayi.mesai && !sayi.ucret)) return null;
  return (
    <div data-onay-bekliyor={sayi.mesai + sayi.ucret} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8,
      background: "var(--erp-purple-bg, #F1ECF7)", border: "1.5px solid var(--erp-purple, #6B4E8A)", borderRadius: "var(--erp-r-md)", padding: "7px 12px", fontSize: 13 }}>
      <span style={{ flex: "1 1 260px" }}><b>Onay bekliyor:</b> {sayi.mesai} mesai bildirimi · {sayi.ucret} işçilik ücreti</span>
      <button type="button" className="btn-primary" data-onay-ac onClick={onAc} style={{ padding: "6px 14px", fontSize: 13 }}>Onaylar</button>
    </div>
  );
}
