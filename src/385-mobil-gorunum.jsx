// ================= MOBİL GÖRÜNÜM DÜZENLEYİCİ =================
//
// Kullanıcı (14 Eylül): "Mobil için dizayn yapacağımız ve kısıtlama yapacağımız ekran en
// mantıklısı. Sürükle bırak şeklinde olsun; neyi nereye koyacaksan, hangi dizaynda olacaksa pratik
// bir ekran tanımlayalım."
//
// NE YAPIYOR: telefonda hangi modüllerin görüneceğini ve HANGİ SIRAYLA duracağını kullanıcı
// belirliyor. Sıralamadaki ilk dört modül alt çubuğa çıkıyor (telefonun asıl gezinme yeri);
// gerisi "Tümü" listesinde. Gizlenenler telefonda hiç görünmüyor — masaüstünde hepsi durmaya
// devam ediyor.
//
// SÜRÜKLEME: HTML5 drag&drop telefonda çalışmaz; pointer olayları (fare + dokunmatik tek API)
// kullanılıyor. Öğeye basılı tutup sürükleyince liste yer değiştiriyor. Sürükleme yapamayan ya da
// yapmak istemeyen için ↑ ↓ düğmeleri de duruyor — tek yola bağlı kalmak, dokunmatik sürüklemenin
// kaydığı telefonlarda ekranı kullanılmaz yapardı.
//
// KAYIT: `tanimlar.mobilGorunum = { sira: [anahtar…], gizli: [anahtar…] }`. Liste boşsa varsayılan
// sıra geçerli — yani ayar yapılmadan da her şey eskisi gibi çalışıyor.
const MOBIL_MODULLER = [
  { key: "anasayfa", ad: "Anasayfa" },
  { key: "siparis", ad: "Sipariş" },
  { key: "satinalma", ad: "Alış Siparişi" },
  { key: "cari", ad: "Cari" },
  { key: "stok", ad: "Stok" },
  { key: "uretim", ad: "Üretim" },
  { key: "depo", ad: "Depo" },
  { key: "paketleme", ad: "Paketleme" },
  { key: "planlama", ad: "Planlama" },
  { key: "fisler", ad: "Fişler" },
  { key: "muhasebe", ad: "Muhasebe" },
  { key: "gorevler", ad: "Sohbet" },
  { key: "tanimlar", ad: "Tanımlar" },
];

// MODÜL İÇİ BÖLÜMLER (kullanıcı, 15 Eylül: "listelerin içine girelim, liste içinden de seçim
// yapılabilsin, oradan açık kapalı aşağı yukarı"). Modülün içindeki ayrı ayrı açılıp kapanabilen
// parçalar. Katalog elle tutuluyor: her bölümün uygulama tarafında bir karşılığı olmalı, yoksa
// ayar süs olur — listeye bir şey eklemek, o parçayı gizleyen kodu da yazmak demek.
const MOBIL_BOLUMLER = {
  siparis: [
    { key: "planlama", ad: "Tedarik Planlama" },
    { key: "ihtiyac", ad: "Hammadde İhtiyacı" },
    { key: "rezervasyon", ad: "Rezervasyon / Hammadde Alışları" },
    { key: "tedarikGirisleri", ad: "Tedarik Girişleri" },
    { key: "fisGecmisi", ad: "Fiş Geçmişi" },
  ],
  satinalma: [
    { key: "planlama", ad: "Tedarik Planlama" },
    { key: "ihtiyac", ad: "Hammadde İhtiyacı" },
    { key: "rezervasyon", ad: "Rezervasyon" },
    { key: "tedarikGirisleri", ad: "Tedarik Girişleri" },
    { key: "fisGecmisi", ad: "Fiş Geçmişi" },
  ],
};

// Bir modülün bölüm ayarını çözer (sıra + gizli), modül listesiyle aynı mantık.
function mobilBolumCoz(ayar, modulKey) {
  const katalog = MOBIL_BOLUMLER[modulKey] || [];
  const kayit = (ayar && ayar.bolumler && ayar.bolumler[modulKey]) || {};
  const sira = (Array.isArray(kayit.sira) ? kayit.sira : []).filter((k) => katalog.some((b) => b.key === k));
  const gizli = new Set(Array.isArray(kayit.gizli) ? kayit.gizli : []);
  const tamSira = [...sira, ...katalog.map((b) => b.key).filter((k) => !sira.includes(k))];
  return { sira: tamSira, gizli, gorunur: tamSira.filter((k) => !gizli.has(k)) };
}

// Ayarı okunur hâle getirir: sırada olmayan modüller sona eklenir (yeni modül geldiğinde ayar
// bozulmasın), gizliler ayrılır.
function mobilGorunumCoz(ayar) {
  const sira = (ayar && Array.isArray(ayar.sira) ? ayar.sira : []).filter((k) => MOBIL_MODULLER.some((m) => m.key === k));
  const gizli = new Set((ayar && Array.isArray(ayar.gizli) ? ayar.gizli : []));
  const eksikler = MOBIL_MODULLER.map((m) => m.key).filter((k) => !sira.includes(k));
  const tamSira = [...sira, ...eksikler];
  return {
    sira: tamSira,
    gizli,
    gorunur: tamSira.filter((k) => !gizli.has(k)),
    // Alt çubukta kaç modül duracak (kullanıcı, 15 Eylül: "ilk 4 sıradan fazla olsun"). 3–8 arası.
    altCubukSayisi: Math.min(8, Math.max(3, Number((ayar && ayar.altCubukSayisi) || 4))),
  };
}

function MobilGorunumDuzenleyici({ tanimlar, onSave, showToast, mobilDuzenKipi, onMobilDuzenKipi, mobilDuzenAktif }) {
  const cozum = mobilGorunumCoz(tanimlar.mobilGorunum);
  const [sira, setSira] = useState(cozum.sira);
  const [gizli, setGizli] = useState([...cozum.gizli]);
  const [altCubukSayisi, setAltCubukSayisi] = useState(cozum.altCubukSayisi);
  const [acikModul, setAcikModul] = useState(null);   // içine girilen modül
  const [surukleIndex, setSurukleIndex] = useState(null);
  const [hedefIndex, setHedefIndex] = useState(null);
  const kapRef = useRef(null);

  const ad = (k) => (MOBIL_MODULLER.find((m) => m.key === k) || {}).ad || k;
  const gizliMi = (k) => gizli.includes(k);

  function kaydet(yeniSira, yeniGizli, ekler) {
    setSira(yeniSira); setGizli(yeniGizli);
    const oncekiBolumler = (tanimlar.mobilGorunum || {}).bolumler || {};
    onSave({
      ...tanimlar,
      mobilGorunum: {
        sira: yeniSira, gizli: yeniGizli,
        altCubukSayisi: (ekler && ekler.altCubukSayisi) || altCubukSayisi,
        bolumler: (ekler && ekler.bolumler) || oncekiBolumler,
      },
    });
  }

  function bolumKaydet(modulKey, yeniSira, yeniGizli) {
    const oncekiBolumler = (tanimlar.mobilGorunum || {}).bolumler || {};
    kaydet(sira, gizli, { bolumler: { ...oncekiBolumler, [modulKey]: { sira: yeniSira, gizli: yeniGizli } } });
  }

  function tasi(i, yon) {
    const j = i + yon;
    if (j < 0 || j >= sira.length) return;
    const yeni = [...sira];
    [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    kaydet(yeni, gizli);
  }

  // Pointer ile sürükleme: satırların ekran konumlarından hedef sırayı buluyoruz. Fare ve parmak
  // aynı olay akışını kullanıyor, ayrı dokunmatik kodu gerekmiyor.
  function pointerBasla(e, i) {
    e.preventDefault();
    setSurukleIndex(i); setHedefIndex(i);
    const hareket = (ev) => {
      const kap = kapRef.current;
      if (!kap) return;
      const y = ev.clientY;
      const satirlar = [...kap.querySelectorAll("[data-mobil-satir]")];
      let bulunan = satirlar.length - 1;
      for (let k = 0; k < satirlar.length; k++) {
        const r = satirlar[k].getBoundingClientRect();
        if (y < r.top + r.height / 2) { bulunan = k; break; }
      }
      setHedefIndex(bulunan);
    };
    const bitir = () => {
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", bitir);
      setSurukleIndex((baslangic) => {
        setHedefIndex((hedef) => {
          if (baslangic != null && hedef != null && baslangic !== hedef) {
            const yeni = [...sira];
            const [tasinan] = yeni.splice(baslangic, 1);
            yeni.splice(hedef, 0, tasinan);
            kaydet(yeni, gizli);
          }
          return null;
        });
        return null;
      });
    };
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", bitir);
  }

  const gorunur = sira.filter((k) => !gizliMi(k));

  return (
    <div data-mobil-gorunum="1">
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Mobil Görünüm</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Telefonda hangi modüllerin görüneceğini ve sırasını siz belirleyin. Satırı basılı tutup sürükleyin
        (ya da ok düğmelerini kullanın); göz düğmesi modülü telefonda gizler. <b>İlk sıradakiler alt çubukta</b>
        çıkar (kaç tane olacağını siz seçiyorsunuz). Modül adına dokununca <b>içindeki bölümleri</b> de
        açıp kapatabilir, sıralayabilirsiniz. Masaüstü görünümü bundan etkilenmez.
      </p>

      {/* DÜZEN KİPİ (15 Eylül): kullanıcı "alt çubuk mobilde görünmüyor" dedi — geniş telefon /
          "masaüstü site" kipinde genişlik eşiği tutmuyordu. Artık cihaz başına seçilebiliyor. */}
      <div data-mobil-kip={mobilDuzenKipi} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Bu cihazda düzen:</span>
        {[{ k: "oto", ad: "Otomatik" }, { k: "acik", ad: "Her zaman mobil" }, { k: "kapali", ad: "Her zaman masaüstü" }].map((x) => (
          <button key={x.k} type="button" data-mobil-kip-sec={x.k} onClick={() => onMobilDuzenKipi && onMobilDuzenKipi(x.k)}
            style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1.5px solid ${mobilDuzenKipi === x.k ? "var(--erp-purple)" : "var(--erp-border)"}`,
              background: mobilDuzenKipi === x.k ? "#6B4E8A1A" : "#fff", color: mobilDuzenKipi === x.k ? "var(--erp-purple)" : "var(--erp-text-2)" }}>
            {x.ad}
          </button>
        ))}
        <span className="mono" style={{ fontSize: 11, color: mobilDuzenAktif ? "#3F5A33" : "var(--erp-text-3)" }}>
          şu an: {mobilDuzenAktif ? "mobil düzen" : "masaüstü düzeni"}
        </span>
      </div>

      {/* Alt çubuk önizlemesi: sıradaki ilk görünür modüller. */}
      <div style={{ background: "#EDF2EC", border: "1px solid #AFCAA8", borderRadius: "var(--erp-r-lg)", padding: "8px 10px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#455A40" }}>Telefonda alt çubuk şöyle görünecek:</span>
          <label style={{ marginLeft: "auto", fontSize: 11, color: "#455A40", display: "inline-flex", alignItems: "center", gap: 4 }}>
            kaç modül:
            <select value={altCubukSayisi} data-mobil-altcubuk-sayisi="1"
              onChange={(e) => { const n = Number(e.target.value); setAltCubukSayisi(n); kaydet(sira, gizli, { altCubukSayisi: n }); }}
              style={{ padding: "2px 6px", fontSize: 11, borderRadius: "var(--erp-r-md)", border: "1px solid #AFCAA8" }}>
              {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span data-mobil-onizleme="saha" style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--erp-purple)" }}>Saha</span>
          {gorunur.slice(0, altCubukSayisi).map((k) => (
            <span key={k} data-mobil-onizleme={k} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--erp-primary-2)" }}>{ad(k)}</span>
          ))}
        </div>
      </div>

      <div ref={kapRef} style={{ display: "grid", gap: 4 }}>
        {sira.map((k, i) => {
          const suruklenen = surukleIndex === i;
          const hedefte = hedefIndex === i && surukleIndex != null && surukleIndex !== i;
          return (
            <div key={k} data-mobil-satir={k} data-mobil-sira={i}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: "var(--erp-r-md)",
                background: gizliMi(k) ? "#F6F1E7" : "#fff",
                border: `1px solid ${hedefte ? "var(--erp-info)" : "var(--erp-border-2)"}`,
                opacity: suruklenen ? 0.5 : 1,
                boxShadow: hedefte ? "0 -2px 0 #3D6B8A inset" : "none",
              }}>
              <span data-mobil-tutamak={k} onPointerDown={(e) => pointerBasla(e, i)}
                title="Basılı tutup sürükleyin"
                style={{ cursor: "grab", color: "var(--erp-text-3)", touchAction: "none", display: "flex", padding: "2px 4px" }}>
                <Layers size={14} />
              </span>
              {i < altCubukSayisi && !gizliMi(k) && (
                <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#3F5A33", background: "#E7F0E3", borderRadius: "var(--erp-r-pill)", padding: "1px 6px" }}>alt çubuk</span>
              )}
              <button type="button" data-mobil-ac={k}
                onClick={() => setAcikModul(acikModul === k ? null : k)}
                disabled={(MOBIL_BOLUMLER[k] || []).length === 0}
                title={(MOBIL_BOLUMLER[k] || []).length ? "İçindeki bölümleri düzenle" : "Bu modülde ayarlanabilir bölüm yok"}
                style={{ border: "none", background: "none", cursor: (MOBIL_BOLUMLER[k] || []).length ? "pointer" : "default",
                  padding: 0, fontSize: 13, fontWeight: 700, color: gizliMi(k) ? "var(--erp-text-3)" : "#33281C",
                  textDecoration: gizliMi(k) ? "line-through" : "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                {ad(k)}
                {(MOBIL_BOLUMLER[k] || []).length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
                    {acikModul === k ? "▾" : "▸"} {(MOBIL_BOLUMLER[k] || []).length} bölüm
                  </span>
                )}
              </button>
              <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                <button type="button" className="btn-ghost" data-mobil-yukari={k} onClick={() => tasi(i, -1)} disabled={i === 0}
                  title="Yukarı" style={{ padding: "3px 7px", fontSize: 11 }}>↑</button>
                <button type="button" className="btn-ghost" data-mobil-asagi={k} onClick={() => tasi(i, 1)} disabled={i === sira.length - 1}
                  title="Aşağı" style={{ padding: "3px 7px", fontSize: 11 }}>↓</button>
                <button type="button" className="btn-ghost" data-mobil-gizle={k}
                  onClick={() => kaydet(sira, gizliMi(k) ? gizli.filter((x) => x !== k) : [...gizli, k])}
                  title={gizliMi(k) ? "Telefonda göster" : "Telefonda gizle"}
                  style={{ padding: "3px 7px", fontSize: 11, color: gizliMi(k) ? "var(--erp-text-3)" : "var(--erp-info)" }}>
                  {gizliMi(k) ? "gizli" : "açık"}
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {/* MODÜL İÇİ BÖLÜMLER: seçilen modülün parçaları — aynı düzen (aç/kapa, ↑ ↓). */}
      {acikModul && (MOBIL_BOLUMLER[acikModul] || []).length > 0 && (() => {
        const bc = mobilBolumCoz(tanimlar.mobilGorunum || {}, acikModul);
        const bAd = (bk) => ((MOBIL_BOLUMLER[acikModul] || []).find((b) => b.key === bk) || {}).ad || bk;
        const bTasi = (i, yon) => {
          const j = i + yon;
          if (j < 0 || j >= bc.sira.length) return;
          const yeni = [...bc.sira];
          [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
          bolumKaydet(acikModul, yeni, [...bc.gizli]);
        };
        return (
          <div data-mobil-bolumler={acikModul} style={{ marginTop: 10, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{ad(acikModul)} — telefonda görünecek bölümler</div>
            <div style={{ display: "grid", gap: 4 }}>
              {bc.sira.map((bk, i) => {
                const kapali = bc.gizli.has(bk);
                return (
                  <div key={bk} data-mobil-bolum={bk} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
                    background: kapali ? "#F6F1E7" : "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)" }}>
                    <b style={{ fontSize: 12, color: kapali ? "var(--erp-text-3)" : "#33281C", textDecoration: kapali ? "line-through" : "none" }}>{bAd(bk)}</b>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                      <button type="button" className="btn-ghost" data-mobil-bolum-yukari={bk} onClick={() => bTasi(i, -1)} disabled={i === 0} style={{ padding: "2px 6px", fontSize: 11 }}>↑</button>
                      <button type="button" className="btn-ghost" data-mobil-bolum-asagi={bk} onClick={() => bTasi(i, 1)} disabled={i === bc.sira.length - 1} style={{ padding: "2px 6px", fontSize: 11 }}>↓</button>
                      <button type="button" className="btn-ghost" data-mobil-bolum-gizle={bk}
                        onClick={() => bolumKaydet(acikModul, bc.sira, kapali ? [...bc.gizli].filter((x) => x !== bk) : [...bc.gizli, bk])}
                        style={{ padding: "2px 7px", fontSize: 11, color: kapali ? "var(--erp-text-3)" : "var(--erp-info)" }}>
                        {kapali ? "gizli" : "açık"}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <button type="button" className="btn-ghost" data-mobil-sifirla="1" style={{ marginTop: 10, padding: "5px 11px", fontSize: 12 }}
        onClick={() => { setAltCubukSayisi(4); setAcikModul(null); kaydet(MOBIL_MODULLER.map((m) => m.key), [], { altCubukSayisi: 4, bolumler: {} }); showToast("Mobil görünüm varsayılana döndü"); }}>
        Varsayılana dön
      </button>
    </div>
  );
}
