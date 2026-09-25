function PlanlamaBolumu({ siparis, stok, cariler, tumSiparisler, uretimSiparisleri, onPlanlaUretim, onPlanlaSatinAlma, onSiparisGit, onGoToUretim, onFiseGitNo, onPlanlamaTemizle, asortiler, varsayilanTip, sonrasindaYonlendir, firmaBilgileri, showToast }) {
  const planlanacaklar = siparis.kalemler.filter((k) => k.miktar - (k.karsilanan || 0) > 0);

  // BOŞKEN SEBEBİNİ SÖYLE (kullanıcı, 19 Eylül: "eksik kalan tedarik planlama yine yok").
  //
  // Planlanacak kalem kalmadığında bölüm HİÇ çizilmiyordu; ekranda bir şey yokken kullanıcı
  // "planlama çalışmıyor" mu yoksa "planlanacak bir şey kalmadı" mı olduğunu ayırt edemiyordu.
  // Boşluk bir cevap değil: sipariş kapandıysa bunu yazmak gerekiyor.
  if (planlanacaklar.length === 0) {
    const toplam = (siparis.kalemler || []).reduce((t, k) => t + (k.miktar || 0), 0);
    const karsilanan = (siparis.kalemler || []).reduce((t, k) => t + (k.karsilanan || 0), 0);
    const fazla = karsilanan - toplam;
    return (
      <div style={{ marginTop: 16 }} data-planlama-bos="1">
        <StitchDivider color="#C97B3D" />
        <div style={{ border: "1px dashed #C9B99A", borderRadius: "var(--erp-r-md)", padding: "12px 14px", background: "var(--erp-panel)",
          fontSize: 12, color: "var(--erp-text-2)", lineHeight: 1.6 }}>
          <b style={{ color: "var(--erp-text)" }}>Planlanacak kalem yok.</b>{" "}
          Siparişin {toplam} adedinin tamamı karşılandı
          {fazla > 0 ? ` (${fazla} adet FAZLA sevk edildi — faturaya yansımalı).` : "."}
          {" "}Yeni bir üretim ya da alış planlamak için önce siparişe kalem eklemelisiniz.
        </div>
      </div>
    );
  }

  // Aynı ürüne ait tüm renk/beden kalemlerini tek satırda toplar.
  const gruplar = [];
  const index = {};
  planlanacaklar.forEach((k) => {
    const key = k.urunId;
    if (!(key in index)) {
      index[key] = gruplar.length;
      gruplar.push({ key, urunId: k.urunId, urunAd: k.urunAd, kalemler: [] });
    }
    gruplar[index[key]].kalemler.push(k);
  });

  return (
    <div style={{ marginTop: 16 }}>
      <StitchDivider color="#C97B3D" />
      <div style={{ border: "1.5px solid #C97B3D", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#FBF3EA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderBottom: "1px solid #E8D4BE" }}>
          <ClipboardList size={14} color="#C97B3D" />
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#C97B3D" }}>
            Tedarik Planlama
          </span>
          <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>({gruplar.length} ürün henüz karşılanmadı)</span>
        </div>
        <div style={{ background: "#fff" }}>
        {gruplar.map((g, i) => (
          <PlanlamaSatiri
            key={g.key}
            grup={g}
            siparis={siparis}
            stok={stok}
            cariler={cariler}
            tumSiparisler={tumSiparisler}
            uretimSiparisleri={uretimSiparisleri}
            onPlanlaUretim={onPlanlaUretim}
            onPlanlaSatinAlma={onPlanlaSatinAlma}
            sonSatir={i === gruplar.length - 1}
            onSiparisGit={onSiparisGit}
            firmaBilgileri={firmaBilgileri}
          showToast={showToast}
          onFiseGitNo={onFiseGitNo}
          onGoToUretim={onGoToUretim}
            onPlanlamaTemizle={onPlanlamaTemizle}
            asortiler={asortiler}
            varsayilanTip={varsayilanTip}
            sonrasindaYonlendir={sonrasindaYonlendir}
          />
        ))}
        </div>
      </div>
    </div>
  );
}

function PlanlamaSatiri({ grup, siparis, stok, cariler, tumSiparisler, uretimSiparisleri, onPlanlaUretim, onPlanlaSatinAlma, sonSatir, onSiparisGit, onGoToUretim, onFiseGitNo, onPlanlamaTemizle, asortiler, varsayilanTip, sonrasindaYonlendir, firmaBilgileri, showToast }) {
  // ESKİDEN: tek bir "secim" (Uretim/Satınalma), TÜM bekleyen kalemlere BİRDEN uygulanıyordu — yani
  // aynı ürünün Kırmızı rengi Satınalma'ya, Siyah rengi Üretim'e AYRI AYRI planlanamıyordu. Artık HER
  // RENK SATIRININ kendi tip seçimi var: kalemTipleri = { [kalemId]: "Uretim" | "Satınalma" }.
  // `varsayilanTip` verilmişse (örn. Sipariş Planlama ekranında "Üret" ya da "Satın Al" butonuna
  // basılarak buraya gelindiyse), TÜM bekleyen kalemler o tiple ÖNCEDEN doldurulur — kullanıcı hemen
  // miktarları görüp Onayla'ya basabilir, ayrıca tek tek "Seçin…" açmasına gerek kalmaz. Yine de HER
  // satırın kendi seçicisi aktif kalır — isterse tek tek değiştirebilir (aynı mantık, sadece başlangıç
  // değeri farklı — "sipariş içindeki" akışla birebir aynı kod kullanılır, ayrı bir mekanizma YOKTUR).
  const [kalemTipleri, setKalemTipleri] = useState(() => {
    if (!varsayilanTip) return {};
    const baslangic = {};
    grup.kalemler.filter((k) => !k.planlama).forEach((k) => { baslangic[k.id] = varsayilanTip; });
    return baslangic;
  });
  const [cariId, setCariId] = useState("");
  const [miktarlar, setMiktarlar] = useState(() => {
    if (!varsayilanTip) return {};
    const baslangic = {};
    grup.kalemler.filter((k) => !k.planlama).forEach((k) => { baslangic[k.id] = String(k.miktar - (k.karsilanan || 0)); });
    return baslangic;
  });
  const tedarikciler = cariler.filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi");
  const urun = stok.find((p) => p.id === grup.kalemler[0].urunId);

  const satirStil = {
    padding: "9px 12px",
    borderBottom: sonSatir ? "none" : "1px solid #E4D8C0",
  };

  const planlanmisKalemler = grup.kalemler.filter((k) => k.planlama);
  const bekleyenKalemler = grup.kalemler.filter((k) => !k.planlama);
  const formAcikMi = Object.values(kalemTipleri).some((t) => t);

  function mevcutStok(renk, beden) {
    return urun ? ((urun.variants.find((v) => v.renk === renk && v.beden === beden) || {}).miktar || 0) : 0;
  }

  function kalan(k) {
    return k.miktar - (k.karsilanan || 0);
  }

  // Tek bir renk grubunun tipini değiştirir — SADECE o rengin bedenlerini etkiler, diğer renkler
  // kendi (varsa farklı) tipinde kalmaya devam eder. Bu, "her satır için ayrı planlama" özelliğinin özü.
  function renkTipiDegistir(renkKalemleri, tip) {
    const yeniTipler = { ...kalemTipleri };
    const yeniMiktarlar = { ...miktarlar };
    renkKalemleri.forEach((k) => {
      if (tip) {
        yeniTipler[k.id] = tip;
        if (yeniMiktarlar[k.id] == null) yeniMiktarlar[k.id] = String(kalan(k));
      } else {
        delete yeniTipler[k.id];
      }
    });
    setKalemTipleri(yeniTipler);
    setMiktarlar(yeniMiktarlar);
  }

  return (
    <div style={satirStil}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90 }}>{grup.urunAd}</span>
        <div style={{ flex: 1, overflowX: "auto" }}>
          {planlanmisKalemler.length === 0 ? null : (() => {
            // ÖNEMLİ: bu üst tablo SADECE zaten planlanmış (üretime/satınalmaya verilmiş) kalemleri
            // gösterir. Henüz planlanmamış (bekleyen) kalemler burada TEKRAR gösterilmez — çünkü zaten
            // aşağıdaki interaktif "Her renk için ayrı ayrı..." tablosunda görünüyorlar; aynı "kalan: X"
            // bilgisini iki ayrı tabloda tekrarlamak (biri salt-okunur, biri düzenlenebilir) karışıklığa
            // yol açıyordu. Bekleyen bir renk/beden için hiç planlanmış kaydı yoksa, o satır/sütun bu
            // tabloda hiç görünmez — tüm dikkat aşağıdaki TEK, eyleme geçirilebilir tabloya yönlenir.
            const tumKalemler = planlanmisKalemler;
            const renkSirasi = [];
            const gruplar = {};
            tumKalemler.forEach((k) => {
              if (!(k.renk in gruplar)) { gruplar[k.renk] = {}; renkSirasi.push(k.renk); }
              // Bir kalem KISMEN planlandığında ikiye bölünebilir — aynı renk+beden hücresinde birden
              // fazla planlanmış parça (örn. hem üretim hem satınalma) birlikte bulunabilir.
              if (!gruplar[k.renk][k.beden]) gruplar[k.renk][k.beden] = [];
              gruplar[k.renk][k.beden].push(k);
            });
            const tumBedenler = Array.from(new Set(tumKalemler.map((k) => k.beden)));

            function durumHesapla(k) {
              let gerceklesti = false, kismenGirildi = false, bagliSiparis = null, bagliUretim = null;
              if (k.planlama.tip === "Satınalma") {
                bagliSiparis = (tumSiparisler || []).find((s) => s.siparisNo === k.planlama.referansNo);
                gerceklesti = bagliSiparis && bagliSiparis.durum === "Tamamlandı";
                kismenGirildi = bagliSiparis && bagliSiparis.durum === "Kısmi Teslim";
              } else {
                bagliUretim = (uretimSiparisleri || []).find((o) => o.siparisNo === k.planlama.referansNo);
                gerceklesti = bagliUretim && bagliUretim.stogaEklendiMi;
              }
              const referansGecersiz = k.planlama.tip === "Satınalma" ? !bagliSiparis : !bagliUretim;
              // ALIŞ FİŞLERİ (kullanıcı, 13 Eylül: "Satın alındı — alış siparişi VE alış fişi olmalı"):
              // satın alma planı gerçekleştiyse mal hangi alış fişiyle girdi? Stok hareketlerinden
              // (kaynak Satınalma, siparisNo = alış no, aynı ürün/renk/beden); tıklanınca Fişler'de o fiş.
              const alisFisleri = k.planlama.tip === "Satınalma" ? [...new Set(
                (stok || []).flatMap((u) => u.ad === k.urunAd ? (u.hareketler || []) : [])
                  .filter((h) => h.kaynak === "Satınalma" && h.miktar > 0 && h.siparisNo === k.planlama.referansNo
                    && (h.renk || "") === (k.renk || "") && (h.beden || "") === (k.beden || "") && h.fisNo)
                  .map((h) => h.fisNo))] : [];
              const renk = referansGecersiz ? "var(--erp-text-3)" : gerceklesti ? "var(--erp-primary)" : kismenGirildi ? "#C97B3D" : k.planlama.tip === "Üretim" ? "var(--erp-brown)" : "var(--erp-info)";
              const etiket = referansGecersiz
                ? "Kayıt yok"
                : gerceklesti
                ? (k.planlama.tip === "Üretim" ? "Üretildi" : "Alış Fişi Kesildi")
                : kismenGirildi
                ? "Kısmen Girildi"
                : (k.planlama.tip === "Üretim" ? "Üretimde" : "Alış Siparişinde");
              return { gerceklesti, referansGecersiz, renk, etiket, bagliSiparis, bagliUretim, alisFisleri };
            }

            return (
              <table className="matris-tablo" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10, textAlign: "left", padding: "2px 8px", color: "var(--erp-text-2)", position: "sticky", left: 0, background: "var(--erp-panel)", zIndex: 1 }}>Renk</th>
                    {tumBedenler.map((b) => (
                      <th key={b} style={{ fontSize: 10, textAlign: "center", padding: "2px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renkSirasi.map((renkAdi) => (
                    <tr key={renkAdi}>
                      <td style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)", padding: "2px 8px", whiteSpace: "nowrap", verticalAlign: "top", position: "sticky", left: 0, background: "var(--erp-panel)", zIndex: 1 }}>{renkAdi}</td>
                      {tumBedenler.map((b) => {
                        const kalemlerBurada = gruplar[renkAdi][b];
                        if (!kalemlerBurada || kalemlerBurada.length === 0) return <td key={b}></td>;
                        return (
                          <td key={b} style={{ padding: "2px 4px", textAlign: "center", verticalAlign: "top" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                              {kalemlerBurada.map((k) => {
                                if (bekleyenKalemler.includes(k)) {
                                  const kal = kalan(k);
                                  const stok2 = mevcutStok(k.renk, k.beden);
                                  return (
                                    <span
                                      key={k.id}
                                      className="mono"
                                      title={`Elde: ${stok2}`}
                                      style={{
                                        fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                                        background: "var(--erp-panel)", border: "1px solid #E4D8C0",
                                        color: stok2 < kal ? "var(--erp-warn)" : "var(--erp-primary)", whiteSpace: "nowrap",
                                      }}
                                    >
                                      kalan: {kal}
                                    </span>
                                  );
                                }
                                const d = durumHesapla(k);
                                return (
                                  <button
                                    key={k.id}
                                    type="button"
                                    className="mono"
                                    onClick={() => {
                                      if (d.referansGecersiz) { if (onPlanlamaTemizle) onPlanlamaTemizle(siparis.id, k.id); return; }
                                      if (k.planlama.tip === "Satınalma" && d.bagliSiparis && onSiparisGit) onSiparisGit(d.bagliSiparis.id);
                                      else if (k.planlama.tip === "Üretim" && d.bagliUretim && onGoToUretim) onGoToUretim(d.bagliUretim.id);
                                    }}
                                    title={d.referansGecersiz ? "Bağlı kayıt silinmiş — temizlemek için tıklayın" : `${k.miktar} adet — Fişe git`}
                                    style={{
                                      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(d.renk, "22"), color: d.renk,
                                      border: d.referansGecersiz ? `1px dashed ${d.renk}` : "none", cursor: "pointer", whiteSpace: "nowrap",
                                    }}
                                  >
                                    {/* KAYNAK İKONU + CARİ ADI (kullanıcı, 13 Eylül: "tedarik edilen cari adı da
                                        yazsın, satın alma için ikon olsun"). Çekiç = üretim, paket = satın alma. */}
                                    {k.planlama.tip === "Satınalma" ? <PackageCheck size={9} style={{ display: "inline", verticalAlign: -1 }} /> : <Hammer size={9} style={{ display: "inline", verticalAlign: -1 }} />}{" "}
                                    {d.gerceklesti && <Check size={9} style={{ display: "inline", verticalAlign: -1 }} />} {d.etiket} ({k.miktar}){!d.referansGecersiz && `: ${k.planlama.referansNo}`}
                                    {d.bagliSiparis && (() => { const c = (cariler || []).find((x) => x.id === d.bagliSiparis.cariId); return c ? <span style={{ opacity: 0.85 }}> — {c.unvan}</span> : null; })()}
                                    {/* Alış fişi numaraları: sipariş no'nun yanında, tıklanınca Fişler'de o fiş. */}
                                    {d.alisFisleri && d.alisFisleri.map((f) => (
                                      <span key={f} data-alis-fisi={f} role="link"
                                        title={`Alış fişi ${f} — Fişler'de aç`}
                                        onClick={(e) => { e.stopPropagation(); if (onFiseGitNo) onFiseGitNo(f); }}
                                        style={{ marginLeft: 4, textDecoration: "underline dotted", opacity: 0.9 }}>
                                        {" · "}{f}
                                      </span>
                                    ))}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* TEDARİK KAYITLARI — DETAY (kullanıcı, 13 Eylül: "tedarik sekmesi detaylandırılsın; tedarik
          planlamadan fiş yazdırıp WhatsApp'tan veya mail olarak tedarikçiye gönderme olsun, daha
          önce benzerini yaptık"). Bu ürünün planlandığı her alış siparişi / üretim için bir satır:
          tedarikçi, durum, adet, alış fişleri; alış siparişi için PDF / WhatsApp / E-posta —
          sipariş kartındaki düğmelerin aynısı (siparisPdfIndir, siparisWhatsappGonder,
          siparisEpostaGonder), bağlı ALIŞ siparişi ve TEDARİKÇİ ile. */}
      {(() => {
        const referanslar = [];
        grup.kalemler.forEach((k) => {
          if (!k.planlama || !k.planlama.referansNo) return;
          const no = k.planlama.referansNo;
          let r = referanslar.find((x) => x.no === no);
          if (!r) { r = { no, tip: k.planlama.tip, adet: 0, kalemler: [] }; referanslar.push(r); }
          r.adet += k.miktar || 0; r.kalemler.push(k);
        });
        if (referanslar.length === 0) return null;
        return (
          <div data-tedarik-detay={referanslar.length} style={{ marginTop: 6, display: "grid", gap: 4 }}>
            {referanslar.map((r) => {
              const alis = r.tip === "Satınalma" ? (tumSiparisler || []).find((x) => x.siparisNo === r.no) : null;
              const ur = r.tip === "Üretim" ? (uretimSiparisleri || []).find((x) => x.siparisNo === r.no) : null;
              const cari = alis ? (cariler || []).find((c) => c.id === alis.cariId) : null;
              const fisler = [...new Set((stok || []).flatMap((u) => u.ad === grup.urunAd ? (u.hareketler || []) : [])
                .filter((h) => h.kaynak === "Satınalma" && h.miktar > 0 && h.siparisNo === r.no && h.fisNo).map((h) => h.fisNo))];
              const durum = alis ? alis.durum : ur ? (ur.stogaEklendiMi ? "Üretildi" : (ur.durum || "Üretimde")) : "Kayıt yok";
              return (
                <div key={r.no} data-tedarik-detay-satir={r.no} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, padding: "4px 8px", background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: r.tip === "Satınalma" ? "var(--erp-info)" : "var(--erp-brown)" }}>
                    {r.tip === "Satınalma" ? <PackageCheck size={11} /> : <Hammer size={11} />}
                    {r.tip === "Satınalma" ? "Alış Siparişi" : "Üretim"}
                  </span>
                  <button type="button" className="mono" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 11, textDecoration: "underline dotted", color: "var(--erp-text)" }}
                    onClick={() => { if (alis && onSiparisGit) onSiparisGit(alis.id); else if (ur && onGoToUretim) onGoToUretim(ur.id); }}>{r.no}</button>
                  {cari && <span style={{ fontWeight: 600 }}>{cari.unvan}</span>}
                  <span className="mono" style={{ color: "var(--erp-text-2)" }}>{durum} · {r.adet} {grup.kalemler[0].birim || ""}</span>
                  {fisler.map((f) => (
                    <button key={f} type="button" className="mono" data-alis-fisi-detay={f} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 11, textDecoration: "underline dotted", color: "var(--erp-primary)" }}
                      title="Alış fişi — Fişler'de aç" onClick={() => onFiseGitNo && onFiseGitNo(f)}>fiş {f}</button>
                  ))}
                  {alis && (
                    <span style={{ marginLeft: "auto" }}>
                      <PaylasSeridi kucuk
                        govdeHTML={siparisCiktisiHTML(alis, cari, firmaBilgileri, stok)}
                        dosyaAdi={`${alis.siparisNo} - ${(cari && cari.unvan) || "tedarikçi"}`}
                        cari={cari}
                        konu={`Alış siparişi ${alis.siparisNo} — ${(firmaBilgileri && firmaBilgileri.unvan) || ""}`.trim()}
                        ozet={siparisMetinOzeti(alis, cari)}
                        showToast={showToast} firmaBilgileri={firmaBilgileri}
                      />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {bekleyenKalemler.length > 0 && (
        <div style={{ marginTop: 8, background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", padding: 8 }}>
          <div style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
            Her renk için ayrı ayrı "Üretim" ya da "Alış Siparişi" seçip miktarları düzenleyin:
          </div>
          {(() => {
            // Sipariş kalem girişindeki matris (Ürün | Renk | [beden sütunları] | Fiyat) ile AYNI
            // düzen: satırlar = renk, sütunlar = TÜM bekleyen bedenlerin birleşimi. Bir rengin
            // TAŞIMADIĞI beden sütununda hücre boş kalır (o kombinasyon zaten sipariş edilmemiş).
            const renkGruplari = [];
            const renkIndex = {};
            bekleyenKalemler.forEach((k) => {
              if (!(k.renk in renkIndex)) {
                renkIndex[k.renk] = renkGruplari.length;
                renkGruplari.push({ renk: k.renk, kalemler: [] });
              }
              renkGruplari[renkIndex[k.renk]].kalemler.push(k);
            });
            const tumBedenler = Array.from(new Set(bekleyenKalemler.map((k) => k.beden)));
            return (
              <div style={{ overflowX: "auto" }}>
                <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px", position: "sticky", left: 0, background: "var(--erp-panel)", zIndex: 1 }}>Renk</th>
                      <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px", position: "sticky", left: 60, background: "var(--erp-panel)", zIndex: 1, boxShadow: "none", }}>Tip</th>
                      {tumBedenler.map((b) => (
                        <th key={b} style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{b}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renkGruplari.map((g) => {
                      const tipler = new Set(g.kalemler.map((k) => kalemTipleri[k.id] || ""));
                      const ortakTip = tipler.size === 1 ? [...tipler][0] : "";
                      const kalemBedenIndex = {};
                      g.kalemler.forEach((k) => { kalemBedenIndex[k.beden] = k; });
                      return (
                        <tr key={g.renk} style={{ borderTop: "1px solid #E4D8C0" }}>
                          <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "var(--erp-text)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--erp-panel)", zIndex: 1 }}>{g.renk}</td>
                          <td style={{ padding: "6px 8px", position: "sticky", left: 60, background: "var(--erp-panel)", zIndex: 1, boxShadow: "none", }}>
                            <select
                              value={ortakTip}
                              onChange={(e) => renkTipiDegistir(g.kalemler, e.target.value || null)}
                              style={{ padding: "4px 6px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 11, fontWeight: 600 }}
                            >
                              <option value="">Seçin…</option>
                              <option value="Uretim">Üretilecek</option>
                              <option value="Satınalma">Alış Siparişi</option>
                            </select>
                          </td>
                          {tumBedenler.map((b) => {
                            const k = kalemBedenIndex[b];
                            if (!k) return <td key={b}></td>;
                            const tipSecili = kalemTipleri[k.id];
                            const kal = kalan(k);
                            if (!tipSecili) {
                              return (
                                <td key={b} style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>kalan: {kal}</span>
                                </td>
                              );
                            }
                            const girilen = parseFloat(miktarlar[k.id]) || 0;
                            const asimVar = girilen > kal;
                            return (
                              <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                  <input
                                    type="number" min="0" max={kal}
                                    value={miktarlar[k.id] ?? ""}
                                    onChange={(e) => setMiktarlar({ ...miktarlar, [k.id]: e.target.value })}
                                    className="mono"
                                    style={{
                                      width: 56, padding: "4px 5px", textAlign: "center", fontSize: 12,
                                      border: `1px solid ${asimVar ? "var(--erp-warn)" : "var(--erp-border)"}`, borderRadius: "var(--erp-r-sm)",
                                    }}
                                  />
                                  <span className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>kalan: {kal}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
          {Object.values(kalemTipleri).some((t) => t) && (
            <div style={{ marginTop: 8 }}>
              <AsortiUygulaKontrolu
                asortiler={asortiler}
                bedenSecenekleri={bekleyenKalemler.filter((k) => kalemTipleri[k.id]).map((k) => k.beden)}
                olcuTipi={urunOlcuTipi(stok, grup.urunId)}
                onUygula={(sonuc) => {
                  const yeniMiktarlar = { ...miktarlar };
                  bekleyenKalemler.forEach((k) => {
                    if (kalemTipleri[k.id] && sonuc[k.beden] != null) yeniMiktarlar[k.id] = sonuc[k.beden];
                  });
                  setMiktarlar(yeniMiktarlar);
                }}
              />
            </div>
          )}

          {formAcikMi && Object.values(kalemTipleri).includes("Satınalma") && (
            tedarikciler.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Satın alınacaklar için tedarikçi:</span>
                <select value={cariId} onChange={(e) => setCariId(e.target.value)} style={{ ...inputStyle, width: 160, padding: "5px 7px", fontSize: 12 }}>
                  <option value="">Tedarikçi seçin…</option>
                  {tedarikciler.filter((c) => !c.pasif).map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--erp-warn)", marginBottom: 8 }}>Kayıtlı tedarikçi yok — önce Cari ekranından ekleyin.</div>
            )
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-primary"
              style={{ padding: "5px 10px", fontSize: 11 }}
              disabled={!formAcikMi || (Object.values(kalemTipleri).includes("Satınalma") && !cariId)}
              onClick={() => {
                // Kalemler TİPE göre ikiye ayrılır — her grup için AYRI AYRI (varsa) planlama çağrısı
                // yapılır. Bu, "Kırmızı Üretim'e, Siyah Satınalma'ya" gibi karışık bir onayı TEK
                // tıklamada, doğru şekilde ikiye bölerek işler.
                const uretimGirdileri = bekleyenKalemler
                  .filter((k) => kalemTipleri[k.id] === "Uretim")
                  .map((k) => ({ kalemId: k.id, miktar: parseFloat(miktarlar[k.id]) || 0 }))
                  .filter((g) => g.miktar > 0);
                const satinalmaGirdileri = bekleyenKalemler
                  .filter((k) => kalemTipleri[k.id] === "Satınalma")
                  .map((k) => ({ kalemId: k.id, miktar: parseFloat(miktarlar[k.id]) || 0 }))
                  .filter((g) => g.miktar > 0);
                if (uretimGirdileri.length === 0 && satinalmaGirdileri.length === 0) return;
                if (uretimGirdileri.length > 0) onPlanlaUretim(siparis.id, uretimGirdileri);
                if (satinalmaGirdileri.length > 0) onPlanlaSatinAlma(siparis.id, satinalmaGirdileri, cariId);
                setKalemTipleri({});
                setMiktarlar({});
                setCariId("");
                // "Sipariş Planlama" ekranından buraya gelindiyse (sonrasindaYonlendir sağlanmışsa),
                // onaylama sonrası ilgili ekrana (Üretim ya da Sipariş/Alış) yönlendirilir — sipariş
                // detayının kendi Tedarik Planlama akışında (sonrasindaYonlendir verilmediğinde) bu
                // otomatik yönlendirme YAPILMAZ, kullanıcı sayfada kalır.
                if (sonrasindaYonlendir) {
                  if (uretimGirdileri.length > 0) sonrasindaYonlendir("Uretim");
                  else if (satinalmaGirdileri.length > 0) sonrasindaYonlendir("Satınalma");
                }
              }}
            >
              Onayla
            </button>
            <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { setKalemTipleri({}); setMiktarlar({}); }}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

