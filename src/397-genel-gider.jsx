// ================= GENEL GİDER VE ÇİFT BAŞI MALİYET =================
//
// Kullanıcı (20 Eylül): *"Elektrik, kira, diğer faturalar, SSK, vergi, araç giderleri,
// amortisman ve diğer işçilik maliyetleri gibi veri yok. Bunları ortalama gireceğimiz bir alan
// oluşturalım ve aylık satış adedini bölüp çift başı ortalama gider maliyeti de çıkar buradan...
// Şoför maliyeti 0,20 TL, muhasebeci 0,50 TL, modelci 1 TL gibi... Aylık üretim hedefi koyalım ve
// aylık giderleri buna bölelim. Hem hedefler tutuyor mu görürüz hem maliyetin gerçekleşmesini."*
//
// NEDEN AYRI BİR DEFTER: bu giderler KASADAN ÇIKMADAN önce de bilinir — kira her ay 50.000'dir,
// ödenmeden de maliyete girer. Gelir/gider kartları gerçekleşen ödemeyi izler; burası PLANLANAN
// aylık yükü tutar. İkisi farklı sorulara cevap verir:
//   • Gider kartları: "bu ay ne ödedik?"
//   • Genel gider defteri: "bir çift ayakkabı bana kaça mal oluyor?"
//
// HEDEF ÜRETİM BÖLEN OLARAK: sabit giderler üretim adedine bölününce çift başı yük çıkar.
// Hedef 3.000 çiftken aylık 150.000 TL gider, çift başı 50 TL demektir. Az üretirseniz çift başı
// maliyet ARTAR — hedefin tutup tutmadığını görmek bu yüzden önemli.
//
// MAAŞLI PERSONEL AYRI KALEM: şoför, modelci, muhasebeci fason işçilik yapmaz; ücreti üretim
// adedine bağlı değildir. Fason işçilik zaten cariye borç olarak yazılıyor (kâr-zararda
// "Üretim işçiliği"); buradaki personel onunla KARIŞMAMALI, yoksa aynı gider iki kez sayılır.

const GENEL_GIDER_GRUPLARI = [
  { key: "isletme", ad: "İşletme", ornek: "Kira, elektrik, su, doğalgaz, internet" },
  { key: "personel", ad: "Maaşlı personel", ornek: "Şoför, modelci, muhasebeci, usta başı" },
  { key: "resmi", ad: "Vergi ve SGK", ornek: "SSK primleri, vergiler, stopaj" },
  { key: "arac", ad: "Araç ve lojistik", ornek: "Yakıt, sigorta, bakım, kargo" },
  { key: "amortisman", ad: "Amortisman", ornek: "Makine, kalıp, demirbaş yıpranma payı" },
  { key: "diger", ad: "Diğer", ornek: "Sınıflanmayan sabit giderler" },
];

// Dönemde fiilen üretilen çift: mamul giriş hareketleri (üretimden stoğa giren).
function gerceklesenUretimAdedi(stok, bas, son) {
  let toplam = 0;
  (stok || []).forEach((p) => {
    if (p.kategori !== "Mamul") return;
    (p.hareketler || []).forEach((h) => {
      if (h.kaynak !== "Üretim" || (h.miktar || 0) <= 0) return;
      const t = new Date(h.tarih);
      if (Number.isNaN(t.getTime()) || t < bas || t > son) return;
      toplam += h.miktar || 0;
    });
  });
  return toplam;
}

// KULLANICI TANIMLI GRUPLAR (kullanıcı, 20 Eylül: "ana giderlerde alt gider de eklensin. Örnek
// olarak fason işçilik gideri olsun, alt gider olarak kesim, saya vs. eklensin. Aslında bu gider
// grubu oluyor. Gider grubunu kullanıcı değiştirebilir ve altına istediği kadar gider
// ekleyebilsin.").
//
// Sabit altı grup yetmiyordu: her atölyenin gider yapısı farklı. Gruplar artık tanımlarda
// tutuluyor; yoksa aşağıdaki liste başlangıç olarak kullanılıyor (silinmiyor, sadece varsayılan).
// GRUPLAR KART GRUPLARINDAN GELİYOR (kullanıcı, 20 Eylül: "gider grupları aslında buradan olacak:
// üretim giderleri bir grup, altında kesim vs. olan giderler alt kalem").
//
// Önce ayrı bir grup listesi tutuluyordu; iki yerde iki grup yapısı demekti ve "kesim işçilik
// gideri" kartı bir grupta, genel gider kalemi başka grupta duruyordu. Artık tek kaynak:
// gelir/gider kartlarının grupları (Üretim gideri 730 · Satış-pazarlama 760 · Genel yönetim 770 ·
// Finansman 780). Kartlar alt kalem, gruplar ana başlık.
function genelGiderGruplari(tanimlar) {
  return giderGelirGruplari(tanimlar).filter((g) => g.tur !== "gelir").map((g) => ({ key: g.key, ad: g.ad, ornek: "" }));
}

function GenelGiderEkrani({ tanimlar, onSave, stok, muhasebe, showToast }) {
  const kalemler = tanimlar.genelGiderler || [];
  const gruplar = genelGiderGruplari(tanimlar);

  // GERÇEKLEŞEN TUTAR (kullanıcı: "gider kalemini giderlerden çeksin... elle girilen değerlerin
  // yanında gerçekleşen değerler yazılsın, sapma var mı ne kadar görebilmek adına").
  //
  // Kalem bir gelir/gider kartına bağlanınca, o kartın BU AYKİ kasa/banka çıkışları toplanıyor.
  // Plan ile gerçek yan yana durunca "kira 125.000 dedik, 138.000 ödedik" görünüyor.
  const ayBasiIlk = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const aySonuIlk = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
  const kartGerceklesen = (kartId) => {
    if (!kartId) return null;
    let toplam = 0;
    [...((muhasebe && muhasebe.kasalar) || []), ...((muhasebe && muhasebe.bankalar) || [])].forEach((hes) => {
      (hes.hareketler || []).forEach((h) => {
        if (h.giderKartId !== kartId) return;
        const t = new Date(h.tarih);
        if (Number.isNaN(t.getTime()) || t < ayBasiIlk || t > aySonuIlk) return;
        toplam += (h.yon === "Giriş" ? -1 : 1) * (h.tutar || 0);
      });
    });
    return toplam;
  };
  const hedef = parseFloat(tanimlar.aylikUretimHedefi) || 0;
  const [yeni, setYeni] = useState({ ad: "", grup: "uretim", aylikTutar: "", kartId: "" });

  const toplamAylik = kalemler.reduce((t, k) => t + (parseFloat(k.aylikTutar) || 0), 0);
  const ciftBasi = hedef > 0 ? toplamAylik / hedef : 0;

  // GERÇEKLEŞME: bu ay fiilen kaç çift üretildi? Hedeften azsa çift başı maliyet yükselir.
  const bugun = new Date();
  const ayBas = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const aySon = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0, 23, 59, 59);
  const gerceklesen = gerceklesenUretimAdedi(stok, ayBas, aySon);
  const gercekAdet = gerceklesen;
  const gercekCiftBasi = gerceklesen > 0 ? toplamAylik / gerceklesen : 0;

  function kalemEkle() {
    const ad = String(yeni.ad || "").trim();
    const tutar = parseFloat(yeni.aylikTutar) || 0;
    if (!yeni.kartId) return showToast("Gider kartı seçin");
    if (kalemler.some((k) => k.giderKartId === yeni.kartId)) return showToast(`"${ad}" zaten eklenmiş`);
    if (!ad) return showToast("Gider adı gerekli");
    if (tutar <= 0) return showToast("Aylık tutar gerekli");
    onSave({
      ...tanimlar,
      genelGiderler: [...kalemler, { id: uid("gg"), ad, grup: yeni.grup, aylikTutar: tutar, giderKartId: yeni.kartId }],
    });
    setYeni({ ad: "", grup: yeni.grup, aylikTutar: "", kartId: "" });
    showToast(`"${ad}" eklendi`);
  }

  function kalemSil(id) {
    onSave({ ...tanimlar, genelGiderler: kalemler.filter((k) => k.id !== id) });
  }

  function kalemGuncelle(id, alanlar) {
    onSave({ ...tanimlar, genelGiderler: kalemler.map((k) => (k.id === id ? { ...k, ...alanlar } : k)) });
  }

  const para = (v) => `${(Math.round(v * 100) / 100).toLocaleString("tr-TR")} ₺`;

  return (
    <div data-genel-gider="1" style={{ display: "grid", gap: 12 }}>
      {/* HEDEF: bölen burada. Hedefsiz çift başı maliyet hesaplanamaz. */}
      <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: "10px 12px",
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label="Aylık üretim hedefi (çift)" genislik={180}>
          <input type="number" min="0" step="1" data-uretim-hedefi="1"
            value={tanimlar.aylikUretimHedefi || ""}
            onChange={(e) => onSave({ ...tanimlar, aylikUretimHedefi: e.target.value })}
            placeholder="örn. 3000" style={inputStyle} />
        </Field>
        {/* GERÇEKLEŞEN HEDEFİN YANINDA (kullanıcı, 20 Eylül: "aylık üretim hedefinin yanında
            gerçekleşen hedef olsun — 6000 hedef ama 3000 gerçekleşti ise ona göre plan
            yapacak"). Aşağıdaki kutuda da var ama karar burada veriliyor: hedefi yazarken
            geçen ayın gerçeğini görmek gerekiyor. */}
        <Field label="Bu ay gerçekleşen (çift)" genislik={170}>
          <div className="mono" style={{ padding: "8px 10px", borderRadius: "var(--erp-r-md)", border: "1px solid var(--erp-line)",
            background: "#fff", fontSize: 14, fontWeight: 700,
            color: hedef > 0 && gerceklesen < hedef ? "var(--erp-warn)" : "var(--erp-primary-2)" }}>
            {gerceklesen}
            {hedef > 0 ? <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}> · %{Math.round((gerceklesen / hedef) * 100)}</span> : null}
          </div>
        </Field>
        <div style={{ fontSize: 11, color: "var(--erp-text-2)", lineHeight: 1.5, flex: "1 1 200px" }}>
          Sabit giderler bu adede bölünür. <b>Az üretilirse çift başı maliyet artar.</b>
        </div>
      </div>

      {/* ÖZET: planlanan ve gerçekleşen yan yana. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", background: "#fff", border: "1.5px solid #4E6B4E", borderRadius: "var(--erp-r-md)", padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Aylık toplam sabit gider</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--erp-primary-2)" }}>{para(toplamAylik)}</div>
        </div>
        <div style={{ flex: "1 1 200px", background: "#fff", border: "1.5px solid #3D6B8A", borderRadius: "var(--erp-r-md)", padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Hedefe göre çift başı</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--erp-info)" }}>
            {hedef > 0 ? para(ciftBasi) : "—"}
          </div>
          <div style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{hedef > 0 ? `${hedef} çift hedef` : "hedef girilmedi"}</div>
        </div>
        <div style={{ flex: "1 1 200px", background: "#fff", border: `1.5px solid ${gerceklesen >= hedef && hedef > 0 ? "var(--erp-primary)" : "#C97B3D"}`,
          borderRadius: "var(--erp-r-md)", padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Bu ay gerçekleşen çift başı</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: gerceklesen >= hedef && hedef > 0 ? "var(--erp-primary-2)" : "var(--erp-warn)" }}>
            {gerceklesen > 0 ? para(gercekCiftBasi) : "—"}
          </div>
          <div style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
            {gerceklesen} çift üretildi
            {hedef > 0 ? ` · hedefin %${Math.round((gerceklesen / hedef) * 100)}'i` : ""}
          </div>
        </div>
      </div>

      {/* GRUP YÖNETİMİ KALDIRILDI (20 Eylül): gruplar artık gelir/gider kartlarının
          gruplarından geliyor, ayrı bir liste tutulmuyor. Tek kaynak — "kesim işçilik gideri"
          kartı hangi gruptaysa, genel gider kalemi de orada. */}
      {/* KALEM EKLEME */}
      <div style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 8 }}>Gider kalemi ekle</div>
        {/* KART SEÇEREK EKLEME (kullanıcı, 20 Eylül: "gider eklerken gider alt kalemleri
            listelensin, oradan seçip eklemek yeterli"). Kartı seçince ad, grup ve gerçekleşen
            bağı KENDİLİĞİNDEN geliyor — elle ad yazmak, aynı gideri iki farklı adla iki yerde
            tutmak demekti. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Gider kartı" genislik={260}>
            <select value={yeni.kartId || ""} data-gg-kart-sec="1"
              onChange={(e) => {
                const kart = (tanimlar.giderKartlari || []).find((k) => k.id === e.target.value);
                setYeni({ ...yeni, kartId: e.target.value, ad: kart ? kart.ad : "", grup: kart ? kart.grup : yeni.grup });
              }}
              style={inputStyle}>
              <option value="">— kart seçin —</option>
              {gruplar.map((g) => {
                const kartlar = (tanimlar.giderKartlari || []).filter((k) => k.grup === g.key);
                if (kartlar.length === 0) return null;
                return (
                  <optgroup key={g.key} label={g.ad}>
                    {kartlar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </Field>
          <Field label="Aylık tutar (₺)" genislik={140}>
            <input type="number" min="0" step="any" data-gg-tutar="1" value={yeni.aylikTutar}
              onChange={(e) => setYeni({ ...yeni, aylikTutar: e.target.value })} style={inputStyle} />
          </Field>
          <button type="button" className="btn-primary" data-gg-ekle="1" style={{ padding: "7px 14px", fontSize: 13 }}
            onClick={kalemEkle}>
            <Plus size={13} /> Ekle
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 6 }}>
          {(gruplar.find((g) => g.key === yeni.grup) || {}).ornek || "Bu grubun altına istediğiniz kadar kalem ekleyebilirsiniz"}
        </div>
      </div>

      {/* KALEM LİSTESİ — her satırda çift başı katkısı yazıyor (kullanıcı: "şoför 0,20 TL,
          muhasebeci 0,50 TL, modelci 1 TL gibi"). */}
      {kalemler.length === 0 ? (
        <EmptyState text="Henüz sabit gider kalemi yok. Kira, elektrik, maaşlı personel gibi aylık giderleri ekleyin." />
      ) : (
        <div style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          {/* ESKİ GRUPLU KALEMLER KAYBOLMASIN (20 Eylül): gruplar kart gruplarına çevrilince,
              eski "isletme/personel/resmi…" gruplu kalemler hiçbir başlığa girmiyor ve ekrandan
              SİLİNMİŞ gibi görünüyordu. Tanımlı gruba girmeyen her kalem "Gruplanmamış" başlığı
              altında listeleniyor — kullanıcı kartını seçip yeniden ekleyebilsin diye. */}
          {[...gruplar, { key: "__eski", ad: "Gruplanmamış (eski kayıt)" }]
            .filter((g) => kalemler.some((k) => (g.key === "__eski"
              ? !gruplar.some((x) => x.key === k.grup)
              : k.grup === g.key)))
            .map((g) => {
            const grupKalemleri = kalemler.filter((k) => (g.key === "__eski"
              ? !gruplar.some((x) => x.key === k.grup)
              : k.grup === g.key));
            const grupToplam = grupKalemleri.reduce((t, k) => t + (parseFloat(k.aylikTutar) || 0), 0);
            return (
              <div key={g.key} data-gg-grup={g.key}>
                <div style={{ padding: "6px 12px", background: "var(--erp-hover)", fontSize: 12, fontWeight: 700, color: "var(--erp-text)",
                  display: "flex", justifyContent: "space-between" }}>
                  <span>{g.ad}</span>
                  <span className="mono">{para(grupToplam)}{hedef > 0 ? ` · çift başı ${para(grupToplam / hedef)}` : ""}</span>
                </div>
                {grupKalemleri.map((k) => (
                  <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                    borderBottom: "1px solid var(--erp-head)", flexWrap: "wrap" }}>
                    <input value={k.ad} onChange={(e) => kalemGuncelle(k.id, { ad: e.target.value })}
                      style={{ flex: "1 1 160px", padding: "4px 8px", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)", fontSize: 13 }} />
                    <input type="number" min="0" step="any" value={k.aylikTutar}
                      onChange={(e) => kalemGuncelle(k.id, { aylikTutar: e.target.value })}
                      style={{ width: 110, padding: "4px 8px", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)", fontSize: 13,
                        textAlign: "right", fontWeight: 700 }} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--erp-info)", fontWeight: 700, minWidth: 92, textAlign: "right" }}>
                      {hedef > 0 ? `${para((parseFloat(k.aylikTutar) || 0) / hedef)}/çift` : "—"}
                    </span>
                    {/* GİDER KARTI BAĞI: gerçekleşen tutar buradan geliyor. */}
                    <select value={k.giderKartId || ""} data-gg-kart={k.id}
                      onChange={(e) => kalemGuncelle(k.id, { giderKartId: e.target.value || null })}
                      title="Bu kalemin gerçekleşen ödemesi hangi gider kartından okunacak"
                      style={{ width: 150, padding: "3px 6px", fontSize: 11, border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)" }}>
                      <option value="">— karta bağlı değil —</option>
                      {(tanimlar.giderKartlari || []).map((kk) => <option key={kk.id} value={kk.id}>{kk.ad}</option>)}
                    </select>
                    {/* GERÇEKLEŞEN VE SAPMA */}
                    {(() => {
                      const gercek = kartGerceklesen(k.giderKartId);
                      if (gercek === null) {
                        return <span style={{ fontSize: 10, color: "var(--erp-border)", minWidth: 150 }}>gerçekleşen yok</span>;
                      }
                      const plan = parseFloat(k.aylikTutar) || 0;
                      const fark = gercek - plan;
                      const yuzde = plan > 0 ? Math.round((fark / plan) * 100) : 0;
                      const renk = Math.abs(yuzde) < 5 ? "var(--erp-primary)" : (fark > 0 ? "var(--erp-danger)" : "var(--erp-info)");
                      return (
                        <span className="mono" style={{ fontSize: 11, color: renk, fontWeight: 700, minWidth: 150, textAlign: "right" }}>
                          gerçek {para(gercek)}
                          {plan > 0 ? ` · ${fark > 0 ? "+" : ""}%${yuzde}` : ""}
                          {gercekAdet > 0 ? ` · ${para(gercek / gercekAdet)}/çift` : ""}
                        </span>
                      );
                    })()}
                    <SilOnayButonu onConfirm={() => kalemSil(k.id)} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--erp-text-3)", lineHeight: 1.5 }}>
        Bu defter <b>planlanan</b> aylık yükü tutar; gerçekleşen ödemeler Gelir/Gider kartlarında
        izlenir. Fason işçilik buraya <b>girilmez</b> — o zaten cariye borç yazılıyor ve kâr-zararda
        "Üretim işçiliği" satırında görünüyor; iki yerde saymak maliyeti şişirirdi.
      </div>
    </div>
  );
}
