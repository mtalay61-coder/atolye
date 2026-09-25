// `hedefFisNo`: başka bir ekrandan "şu fişe git" denildiğinde gelen fiş numarası (kullanıcı,
// 10 Eylül: "kesilmiş fişin içine girsin; fiş ekranına tıklayınca fişe gitsin").
// FİŞLER İKİYE AYRILDI (kullanıcı, 17 Eylül: "fişler stok hareket fişleri ve muhasebe fişleri
// olarak ayrılsın, biri muhasebeye diğeri depoya — para fişi stok değil").
//
// Tek listede alış/satış (stok + para), üretim (yalnız stok) ve tahsilat/ödeme (yalnız para) yan
// yana duruyordu; depocu para fişlerini, muhasebeci üretim fişlerini geçmek zorunda kalıyordu.
// Aynı modül iki menü girişinden `kapsam` ile açılıyor: "stok" (Depo altında) ve "para" (Finans
// altında). Alış/satış İKİSİNDE de var — çünkü hem mal hem para hareketi doğuruyor; fişin iki
// tarafı olduğu gerçeğini gizlemek yerine iki listede de gösteriyoruz.
// FİŞLER TEK YERDE (kullanıcı, 19 Eylül: "fişler tek yerde olması daha doğru; sonuçta satış hem
// muhasebeyi hem stoğu etkileyen bir durum").
//
// v1.325.0'da ikiye ayrılmıştı (Stok Hareket Fişleri / Muhasebe Fişleri). Gerekçe "depocu para
// fişlerini geçmesin"di; ama kullanımda görüldü ki bir SATIŞ fişi zaten iki tarafı birden
// ilgilendiriyor — onu iki listede göstermek, aynı belgeyi iki yerde aramak demek. Ayrım kalktı,
// yerine tip süzgeçleri geldi: tek liste, isteyen çipiyle daraltıyor.

function FislerModule({ kapsam, muhasebe, cariler, stok, siparisler, uretim, onGoToCari, onGoToSiparis, onGoToUretim, onYetimFisTemizle, hedefFisNo, onHedefTuketildi }) {
  const [filtreTip, setFiltreTip] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [acikFis, setAcikFis] = useState(null);

  // HEDEF ARAMAYA YAZILIP FİŞ AÇILIYOR. Liste zaten fiş numarasına göre süzülüyor; ayrı bir
  // "tek fiş" görünümü yazmaya gerek yok. Süzgeç de "Tümü"ye alınıyor — hedef fiş o an seçili
  // tipte olmayabilir ve kullanıcı boş liste görürdü.
  useEffect(() => {
    if (!hedefFisNo) return;
    setQuery(hedefFisNo);
    setFiltreTip("Tümü");
    // Hedef TÜKETİLİYOR: aksi hâlde kullanıcı aramayı temizlese bile her çizimde geri yazılırdı.
    if (onHedefTuketildi) onHedefTuketildi();
  }, [hedefFisNo]);
  const [temizlemeOnayi, setTemizlemeOnayi] = useState(null); // temizlenmek istenen fişin key'i
  // Hangi fişin "İşlemler" menüsü açık (18 Eylül).
  const [islemlerAcik, setIslemlerAcik] = useState(null);

  // KAPSAM (17 Eylül): liste, sayaçlar ve tip çipleri hepsi aynı kapsamdan beslenmeli; yalnız
  // listeyi süzmek, sayaçların kapsam dışı fişleri saymasına ve çiplerin boş süzgeç göstermesine
  // yol açıyordu.
  const tumFisler = tumFisleriTopla(cariler, stok);
  const sayilar = {
    "Tümü": tumFisler.length,
    "Satış": tumFisler.filter((f) => f.tip === "Satış").length,
    "Alış": tumFisler.filter((f) => f.tip === "Alış").length,
    "Üretim Girişi": tumFisler.filter((f) => f.tip === "Üretim Girişi").length,
    "Üretim Çıkışı": tumFisler.filter((f) => f.tip === "Üretim Çıkışı").length,
    "İşçilik": tumFisler.filter((f) => f.tip === "İşçilik").length,
    // PARA FİŞLERİ DE ÇİPLERDE (19 Eylül): ödeme ve tahsilat sayaçları yoktu, o yüzden
    // muhasebe fişleri ekranında yalnız "Tümü" ve "Satış" görünüyordu.
    "Tahsilat": tumFisler.filter((f) => f.tip === "Tahsilat").length,
    "Ödeme": tumFisler.filter((f) => f.tip === "Ödeme").length,
    "Diğer": tumFisler.filter((f) => f.tip === "Diğer").length,
  };

  const q = query.trim().toLowerCase();
  const filtreli = tumFisler.filter((f) => {
    // KAPSAM SÜZGECİ: menüden hangi girişle geldiysek yalnız o kapsamın tipleri.
    if (filtreTip !== "Tümü" && f.tip !== filtreTip) return false;
    if (!q) return true;
    return (
      (f.fisNo || "").toLowerCase().includes(q) ||
      (f.cariAd || "").toLowerCase().includes(q) ||
      (f.siparisNo || "").toLowerCase().includes(q)
    );
  });

  // Her fişin, kaynağına (Satış/Alış siparişi ya da Üretim siparişi) giden bir bağlantısını hesaplar.
  // Amaç: hiçbir fişin "bağlantısız" kalmaması — fiş tipine göre en doğru hedefi bulur, id ile
  // bulamazsa (eski veri) sipariş/üretim NUMARASI üzerinden eşleştirmeye düşer.
  function fisBaglanti(f) {
    if (f.tip === "Satış" || f.tip === "Alış") {
      if (f.siparisId) return { tip: "siparis", id: f.siparisId };
      const bulunan = (siparisler || []).find((s) => s.siparisNo === f.siparisNo);
      if (bulunan) return { tip: "siparis", id: bulunan.id };
    }
    if (f.tip === "Üretim Girişi" || f.tip === "Üretim Çıkışı" || f.tip === "İşçilik") {
      // ÖNCE kesin kimlik (uretimId) ile eşleştir — sipariş ve üretim AYRI sayaçlar kullandığı için
      // aynı numara (örn. "1023") hem bir siparişe hem bir üretime ait olabilir; sadece numaraya
      // (siparisNo) göre eşleştirmek, üretim silindiğinde fişi TESADÜFEN aynı numaralı BAŞKA bir
      // siparişe bağlayıp yanlış/yanıltıcı bir "bağlantı bulundu" göstergesine yol açabilirdi.
      if (f.uretimId) {
        const kesinUretim = (uretim || []).find((o) => o.id === f.uretimId);
        if (kesinUretim) return { tip: "uretim", id: kesinUretim.id };
        // uretimId var ama artık böyle bir üretim yok — bu üretim SİLİNMİŞ demektir, numaraya
        // düşmeden doğrudan "bağlantı yok" say (aksi halde tesadüfi/yanlış eşleşme riski olur).
        return null;
      }
      // Bu alandan önce oluşturulmuş eski kayıtlarda uretimId yoktur — numaraya (fallback) düşülür.
      const bulunanUretim = (uretim || []).find((o) => o.siparisNo === f.siparisNo || o.takipKodu === f.siparisNo);
      if (bulunanUretim) return { tip: "uretim", id: bulunanUretim.id };
      return null;
    }
    // "Diğer" ya da yukarıdakilerin hiçbiri bulunamadıysa: elde varsa sipariş/üretim no'suna, yoksa cariye düş.
    if (f.siparisNo) {
      const bulunanSiparis = (siparisler || []).find((s) => s.siparisNo === f.siparisNo);
      if (bulunanSiparis) return { tip: "siparis", id: bulunanSiparis.id };
      const bulunanUretim2 = (uretim || []).find((o) => o.siparisNo === f.siparisNo || o.takipKodu === f.siparisNo);
      if (bulunanUretim2) return { tip: "uretim", id: bulunanUretim2.id };
    }
    if (f.cariId) return { tip: "cari", id: f.cariId };
    return null;
  }

  // ÜRETİM FİŞİ KİLİDİ — üretim çıkışı, işçilik ve mamul girişi fişleri BURADAN silinmez.
  // Sebep: üretim prosesleri sıralı ilerler ve geri alma da SONDAN GERİYE DOĞRU yapılmalıdır
  // (bir adımın çıktısı sonraki adımın girdisi). Ortadaki bir fişi bu ekrandan silmek zinciri
  // ortasından koparır: hammadde stoğa geri döner ama sonraki proses onu çoktan tüketmiştir.
  // Sıra kontrolü üretim kartındaki geri alma düğmesinde; tek yol orası olsun diye burası kilitli.
  //
  // İSTİSNA: üretim kaydı artık yoksa (bağlantı bulunamıyorsa) fiş bir kalıntıdır, geri alınacak
  // ilerleme kalmamıştır — o zaman temizlemeye izin verilir.
  const URETIM_FIS_TIPLERI = ["Üretim Girişi", "Üretim Çıkışı", "İşçilik"];

  // ÇEK KİLİDİ — işlem görmüş (ciro edilmiş, tahsile verilmiş…) çekin GİRİŞ fişi buradan silinmez.
  // Kural `cekHareketKilidi`nde, `fisGeriAl` ile aynı yerden. Ekran yalnızca ÖNCEDEN söylüyor:
  // "Sil"e basıp reddedilmek, üretim kilidinde de kaçınılan bir deneyim. Ciro fişinin kendisi
  // kilitli DEĞİL — onu silmek ciroyu geri almanın yolu.
  function cekKilidiFis(f) {
    return cekHareketKilidi((f.hareketler || []).map((h) => h.id), { cariler, muhasebe });
  }
  function cekKilitRozeti(kilit) {
    return (
      <span
        data-cek-kilidi="1"
        title={kilit.mesaj}
        style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
          color: "var(--erp-text-2)", background: "var(--erp-panel-2)", border: "1px solid var(--erp-line)",
          borderRadius: "var(--erp-r-pill)", padding: "2px 8px",
        }}
      >
        <Lock size={10} /> Çek işlemde
      </span>
    );
  }
  function uretimKilidiVarMi(f, baglanti) {
    return URETIM_FIS_TIPLERI.includes(f.tip) && !!baglanti && baglanti.tip === "uretim";
  }

  // Fişin ASIL bağlantısı (fişBaglanti), o fişin FİZİKSEL olarak durduğu kaydı (Alış/Satış siparişi ya
  // da Üretim) gösterir. Ama bu Alış siparişi ya da Üretim, Tedarik Planlama üzerinden BAŞKA bir Satış
  // siparişi İÇİN rezerve edilmiş olabilir — bu durumda o "asıl talep eden" satışı da ayrıca gösteririz,
  // böylece zincirin tamamı (Satış → onu karşılamak için açılan Alış/Üretim → bu fiş) görünür olur.
  function fisIlgiliSatis(baglanti) {
    if (!baglanti) return null;
    let kaynakKayit = null;
    if (baglanti.tip === "siparis") kaynakKayit = (siparisler || []).find((s) => s.id === baglanti.id);
    else if (baglanti.tip === "uretim") kaynakKayit = (uretim || []).find((o) => o.id === baglanti.id);
    if (!kaynakKayit) return null;
    // Sadece bir Alış siparişi ya da Üretim kaydı "başka bir sipariş için rezerve edilmiş" olabilir —
    // bir Satış siparişinin kendisi zaten en baştaki taleptir, ayrıca bir "ilgili satış" göstermeye gerek yok.
    if (baglanti.tip === "siparis" && kaynakKayit.tip !== "Alış") return null;
    if (kaynakKayit.rezervasyonSiparisId) {
      const satis = (siparisler || []).find((s) => s.id === kaynakKayit.rezervasyonSiparisId);
      if (satis) return satis;
    }
    // Bu alandan önce oluşturulmuş eski kayıtlarda rezervasyonSiparisId yok — "Kaynak: SAT-xxxx" formatlı
    // nottan (metin eşleşmesiyle) geriye dönük olarak bulmayı dener.
    const notEslesme = (kaynakKayit.not || "").match(/^Kaynak:\s*(.+)$/);
    if (notEslesme) {
      const satisNo = notEslesme[1].trim();
      const satis = (siparisler || []).find((s) => s.siparisNo === satisNo);
      if (satis) return satis;
    }
    return null;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--erp-text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fiş no, sipariş no veya cari adı ara…"
            style={{
              width: "100%", padding: "9px 12px 9px 32px", borderRadius: "var(--erp-r-md)",
              border: "1px solid var(--erp-line)", fontSize: 14, background: "#fff",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {/* TİP ÇİPLERİ — para fişleri de dahil (19 Eylül): tek listede hepsi var, çiple daraltılıyor. */}
        {["Tümü", "Satış", "Alış", "Tahsilat", "Ödeme", "Üretim Girişi", "Üretim Çıkışı", "İşçilik", "Diğer"].map((t) => (
          sayilar[t] > 0 || t === "Tümü" ? (
            <button
              key={t}
              onClick={() => setFiltreTip(t)}
              style={{
                padding: "7px 14px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                border: `1.5px solid ${filtreTip === t ? (FIS_TIP_RENK[t] || "var(--erp-orange)") : "var(--erp-border)"}`,
                background: filtreTip === t ? alfaEkle((FIS_TIP_RENK[t] || "var(--erp-orange)"), "1A") : "#fff",
                color: filtreTip === t ? (FIS_TIP_RENK[t] || "var(--erp-orange)") : "var(--erp-text)",
              }}
            >
              {t} <span className="mono" style={{ fontWeight: 400 }}>({sayilar[t]})</span>
            </button>
          ) : null
        ))}
      </div>

      {filtreli.length === 0 ? (
        <EmptyState text="Gösterilecek fiş bulunamadı." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtreli.map((f) => {
            const acik = acikFis === f.key;
            // ÇİFT SAYIM: bir fiş HEM stok hareketi HEM cari hareketi taşır ve ikisi de aynı
            // ürün+renk+beden'i yazar. İkisini birden gruplamak miktarı İKİ KATI gösteriyordu
            // ("10 m" yerine "20 m"). Mal hareketinin doğru kaynağı stok tarafıdır; para tarafı
            // (`f.toplam`) zaten yalnızca cari hareketlerden hesaplanıyor.
            const stokHareketleri = f.hareketler.filter((h) => h.kaynakTip === "stok");
            const cariHareketleri = f.hareketler.filter((h) => h.kaynakTip === "cari");
            // Birim fiyat yalnızca cari hareketinde duruyor; stok satırına oradan taşınır.
            const fiyatIndeksi = {};
            cariHareketleri.forEach((h) => {
              if (!h.urunAd || h.birimFiyat == null) return;
              fiyatIndeksi[`${h.urunAd}|${h.renk}|${h.beden}`] = {
                // `birim` de buradan taşınır: stok hareketinde birim alanı yok, "Top: 15" diye
                // birimsiz bir sayı çıkıyordu.
                birimFiyat: h.birimFiyat, paraBirimi: h.paraBirimi, kalemParaBirimi: h.kalemParaBirimi,
                // Ham fiyat ve kur da taşınır; yoksa KUR sütunu "0 $" gibi anlamsız çıkıyordu.
                hamBirimFiyat: h.hamBirimFiyat, kur: h.kur, kurHedef: h.kurHedef,
                birim: h.birim,
              };
            });
            // Stok hareketi olmayan fişlerde (ödeme, tahsilat) cari tarafına düşülür.
            const detayHareketleri = (stokHareketleri.length > 0 ? stokHareketleri : cariHareketleri)
              .map((h) => ({ ...h, ...(fiyatIndeksi[`${h.urunAd}|${h.renk}|${h.beden}`] || {}) }));
            const urunGruplari = urunRenkGrupla(detayHareketleri);
            const yapisizHareketler = cariHareketleri.filter((h) => !h.urunAd);
            const renk = FIS_TIP_RENK[f.tip] || "var(--erp-text-2)";
            return (
              <div key={f.key} style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setAcikFis(acik ? null : f.key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 14,
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap",
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(renk, "22"), color: renk }}
                  >
                    {f.tip}
                  </span>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{f.fisNo || "—"}</span>
                  <span aria-hidden="true" style={{ color: "var(--erp-border)" }}>·</span>
                  {/* CARİ ADI TIKLANABİLİR (kullanıcı, 18 Eylül: "üstte cari adı yazıyor, orayı
                      tıklanabilir yap ve oradan carisine gitsin"). Dahili işlemde (cari yok)
                      düz metin kalıyor. `stopPropagation`: satırın kendisi fişi açıp kapatıyor. */}
                  {f.cariAd ? (
                    <span
                      data-fis-cari={f.cariAd}
                      onClick={(e) => { e.stopPropagation(); if (onGoToCari) onGoToCari(); }}
                      title={`${f.cariAd} cari kartını aç`}
                      style={{ fontSize: 13, color: "var(--erp-info)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                    >
                      {f.cariAd}
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--erp-text-3)", fontWeight: 600, fontStyle: "italic" }}>
                      Dahili işlem
                    </span>
                  )}
                  <span aria-hidden="true" style={{ color: "var(--erp-border)" }}>·</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{tarihYaz(f.tarih, true)}</span>
                  {/* Cari ekstresindeki rozetin AYNISI — iki ekran aynı fişi aynı bilgilerle
                      göstersin. Yalnızca Çek/Senet: fiş borç yazar, kasadan para çıkarmaz;
                      "Nakit" etiketi ödenmiş izlenimi verirdi. */}
                  {(f.odemeSekli === "Çek" || f.odemeSekli === "Senet") && (
                    <span
                      className="mono"
                      style={{
                        display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700,
                        padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#8A5A3814", color: "var(--erp-brown)",
                      }}
                    >
                      <FileText size={10} /> {f.odemeSekli}{f.vade ? ` · ${f.vade}` : ""}
                    </span>
                  )}
                  <span className="mono" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14 }}>
                    {f.toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[f.paraBirimi] || f.paraBirimi}
                  </span>
                  {acik ? <ChevronDown size={18} color="var(--erp-text-3)" /> : <ChevronRight size={18} color="var(--erp-text-3)" />}
                </button>

                {acik && (() => {
                  const baglanti = fisBaglanti(f);
                  const ilgiliSatis = fisIlgiliSatis(baglanti);
                  return (
                  <div style={{ padding: "0 14px 14px" }}>
                    {/* İŞLEMLER MENÜSÜ (kullanıcı, 18 Eylül: "bunun için de işlemler tuşu yapalım,
                        tıklayınca orada ilgili cariye git, bağlantılı siparişlerini göster, git
                        vs. işlemler yapabilelim"). Bağlantı düğmeleri, sil ve temizle her fişte
                        açıkta duruyordu: kart açılır açılmaz üç dört mavi bağlantı görünüyor,
                        asıl içerik (kalemler) aşağı itiliyordu. Artık tek düğmenin arkasında. */}
                    <button
                      type="button"
                      data-fis-islemler={f.key}
                      onClick={() => setIslemlerAcik(islemlerAcik === f.key ? null : f.key)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8,
                        padding: "5px 12px", borderRadius: "var(--erp-r-md)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${islemlerAcik === f.key ? "var(--erp-info)" : "var(--erp-border)"}`,
                        background: islemlerAcik === f.key ? "#3D6B8A14" : "#fff",
                        color: islemlerAcik === f.key ? "var(--erp-info)" : "var(--erp-text)" }}
                    >
                      İşlemler {islemlerAcik === f.key ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <div data-fis-islem-menusu={islemlerAcik === f.key ? "acik" : "kapali"}
                      style={{ display: islemlerAcik === f.key ? "flex" : "none", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8,
                      background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>
                      {/* Cari kartına gidiş de burada: başlıktaki ada dokunmak da aynı yere götürür,
                          ama menüde arandığında bulunabilsin. */}
                      {f.cariAd && (
                        <button
                          type="button"
                          className="mono"
                          data-islem-cari="1"
                          onClick={() => onGoToCari && onGoToCari()}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                            color: "var(--erp-info)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                        >
                          <Users size={12} /> {f.cariAd} carisine git
                        </button>
                      )}
                      {f.siparisNo && f.siparisNo !== f.fisNo && (
                        <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Sipariş: {f.siparisNo}</span>
                      )}
                      {baglanti ? (
                        <>
                          <button
                            type="button"
                            className="mono"
                            onClick={() => {
                              if (baglanti.tip === "siparis" && onGoToSiparis) onGoToSiparis(baglanti.id);
                              else if (baglanti.tip === "uretim" && onGoToUretim) onGoToUretim(baglanti.id);
                              else if (baglanti.tip === "cari" && onGoToCari) onGoToCari(baglanti.id);
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                              color: "var(--erp-info)", background: "none", border: "none", cursor: "pointer", padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            <ArrowRight size={12} />
                            {baglanti.tip === "siparis" ? "İlgili siparişe git" : baglanti.tip === "uretim" ? "İlgili üretime git" : "İlgili cariye git"}
                          </button>
                          {onYetimFisTemizle && (uretimKilidiVarMi(f, baglanti) ? (
                            <span
                              title="Üretim prosesleri sondan geriye doğru geri alınır. Bu fişi silmek için üretim kartındaki ilgili prosesin 'teslim almayı geri al' düğmesini kullanın."
                              style={{
                                display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
                                color: "var(--erp-text-2)", background: "var(--erp-panel-2)", border: "1px solid var(--erp-line)",
                                borderRadius: "var(--erp-r-pill)", padding: "2px 8px",
                              }}
                            >
                              <Lock size={10} /> Üretimden geri alınır
                            </span>
                          ) : cekKilidiFis(f) ? cekKilitRozeti(cekKilidiFis(f)) : (
                            <button
                              data-fis-sil="1"
                              type="button"
                              className="btn-ghost"
                              title="Bu fişin kaynağı (sipariş/üretim) hâlâ var — silerseniz o kayıtla tutarsız hale gelebilir, dikkatli kullanın"
                              style={{ padding: "2px 8px", fontSize: 11, borderColor: "var(--erp-text-3)", color: "var(--erp-text-2)" }}
                              onClick={() => setTemizlemeOnayi(f.key)}
                            >
                              <Trash2 size={11} /> Sil
                            </button>
                          ))}
                        </>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--erp-warn)", fontStyle: "italic" }}>
                            ⚠ Bu fiş için kaynak bağlantısı bulunamadı
                          </span>
                          {onYetimFisTemizle && (cekKilidiFis(f) ? cekKilitRozeti(cekKilidiFis(f)) : (
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "2px 8px", fontSize: 11, borderColor: "var(--erp-warn)", color: "var(--erp-warn)" }}
                              onClick={() => setTemizlemeOnayi(f.key)}
                            >
                              <Trash2 size={11} /> Bu Fişi Temizle
                            </button>
                          ))}
                        </span>
                      )}
                      {ilgiliSatis && (
                        <button
                          type="button"
                          className="mono"
                          onClick={() => onGoToSiparis && onGoToSiparis(ilgiliSatis.id)}
                          title="Bu alış/üretim, aşağıdaki satış siparişini karşılamak için Tedarik Planlama'dan oluşturulmuştur"
                          style={{
                            display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
                            color: "#C97B3D", background: "var(--erp-hover)", border: "1px solid #C97B3D", borderRadius: "var(--erp-r-pill)",
                            padding: "2px 8px", cursor: "pointer",
                          }}
                        >
                          <ArrowRight size={10} /> İlgili Satış: {ilgiliSatis.siparisNo}
                        </button>
                      )}
                    </div>
                    {temizlemeOnayi === f.key && (
                      <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                          {baglanti
                            ? "⚠ Bu fişin kaynağı (sipariş/üretim) HÂLÂ VAR — bu fişi silerseniz, o kayıttaki miktar/durum bilgileri fişteki hareketlerle tutarsız hale gelebilir (örn. sipariş 'karşılandı' sayılırken stoktan hiç düşülmemiş görünebilir). Yine de bu fişe ait tüm stok/cari hareketlerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                            : "Bu fişin kaynağı (sipariş/üretim) artık yok — kalıntı bir kayıt. Bu fişe ait tüm stok/cari hareketlerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz."}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            data-evet-temizle="1"
                            className="btn-primary"
                            style={{ padding: "6px 12px", fontSize: 12 }}
                            onClick={() => { onYetimFisTemizle(f); setTemizlemeOnayi(null); setAcikFis(null); }}
                          >
                            Evet, Temizle
                          </button>
                          <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setTemizlemeOnayi(null)}>
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Cari ekstresiyle AYNI bileşen — iki ekranın ayrışmaması için. */}
                    {urunGruplari.length > 0 && (
                      <div style={{ marginBottom: yapisizHareketler.length > 0 ? 8 : 0 }}>
                        <FisKalemMatrisi urunGruplari={urunGruplari} stok={stok} />
                      </div>
                    )}
                    {yapisizHareketler.map((h) => (
                      <div key={h.id} style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{h.aciklama || "—"}</div>
                    ))}
                    {/* "… carisine git" düğmesi KALDIRILDI (kullanıcı, 18 Eylül: "ikisi aynı şey").
                        Cari adı başlıkta ZATEN yazıyor ve artık tıklanabilir; ikinci bir düğme
                        aynı yere iki yol demekti. */}
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

