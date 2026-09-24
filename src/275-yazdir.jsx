function ReceteYazdir({ product, tumUrunler, tanimlarProsesler, tanimlarAraProsesler, onClose, onMinimize, firmaBilgileri }) {
  const renkler = Array.from(new Set(product.variants.map((v) => v.renk)));
  // Basım anı SAATLİ: aynı gün birden çok kez basılan bir belgede hangisinin güncel olduğu
// yalnızca günle anlaşılmıyordu.
  const bugun = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

  const receteVarRenk = renkler.find((mr) => (product.recete || []).some((r) => r.mamulRenk === mr));
  let hammaddeSatirlari = [];
  let hammaddeToplami = 0;
  if (receteVarRenk) {
    const ilgiliSatirlar = product.recete.filter((r) => r.mamulRenk === receteVarRenk);
    // Önce proses'e göre böl, ardından her proses içinde hammadde+renk+miktar'a göre grupla —
    // aynı hammadde farklı proseslerde ya da farklı miktarlarla kullanılmışsa her biri ayrı satır olarak kalır.
    receteProsesGrupla(ilgiliSatirlar, tanimlarProsesler, product.receteProsesSirasiOverride).forEach((pg) => {
      receteMaliyetGrupla(pg.satirlar).forEach((g) => {
        const hammadde = (tumUrunler || []).find((p) => p.id === g.satirlar[0].hammaddeUrunId);
        const miktar = g.satirlar[0].miktar || 0;
        const fiyat = hammadde ? (hammadde.alisFiyati || 0) : 0;
        const tutar = miktar * fiyat;
        hammaddeToplami += tutar;
        hammaddeSatirlari.push({
          proses: pg.proses, hammaddeAd: g.hammaddeAd, renk: g.renk, miktar, birim: g.satirlar[0].birim, fiyat, tutar,
        });
      });
    });
  }
  const prosesSiraMap = {};
  (tanimlarProsesler || []).forEach((p) => { prosesSiraMap[p.ad] = p.sira ?? 999; });
  hammaddeSatirlari.sort((a, b) => (prosesSiraMap[a.proses] ?? 999) - (prosesSiraMap[b.proses] ?? 999));

  const isciligSatirlari = Object.entries(product.prosesUcretleri || {})
    .filter(([, u]) => u > 0)
    .map(([proses, ucret]) => ({ proses, ucret, araMi: false }))
    .sort((a, b) => (prosesSiraMap[a.proses] ?? 999) - (prosesSiraMap[b.proses] ?? 999));
  // Ara proses ücretleri (bir ana prosesten sonra otomatik tamamlanan küçük işçilik kalemleri) ayrı
  // satırlar olarak eklenir — bunlar da toplam üretim maliyetinin bir parçasıdır, eksik bırakılmaz.
  Object.entries(product.araProsesEklentileri || {}).forEach(([anaProses, araProsesId]) => {
    if (!araProsesId) return;
    const tanimliAp = (tanimlarAraProsesler || []).find((ap) => ap.id === araProsesId);
    if (!tanimliAp) return;
    const ozelUcret = (product.araProsesUcretleri || {})[araProsesId];
    const ucret = ozelUcret != null ? ozelUcret : (tanimliAp.ucret || 0);
    if (ucret > 0) {
      isciligSatirlari.push({ proses: `${tanimliAp.ad} (${anaProses} sonrası)`, ucret, araMi: true });
    }
  });
  const isciligToplami = isciligSatirlari.reduce((s, x) => s + x.ucret, 0);
  const genelToplam = hammaddeToplami + isciligToplami;

  return (
    <div
      style={{
        // Sekme şeridi ekranın üstünü kapladığından pencere onun ALTINDAN başlar; aksi halde
        // pencerenin kapat/küçült bölgesi şeridin altında kalıp erişilemez oluyordu.
        position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
        zIndex: 100, background: "rgba(34,27,20,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div className="yazdir-alani" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(firmaBilgileri || {}).logo && (
                <img src={firmaBilgileri.logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
              )}
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#3A291D" }}>
                  {(firmaBilgileri || {}).unvan || "Atölye ERP"}
                </div>
                <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Ürün Reçetesi</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", textAlign: "right" }}>
              Tarih: <span className="mono">{bugun}</span>
            </div>
          </div>

          <StitchDivider />

          <div style={{ marginBottom: 18, fontSize: 13, display: "flex", alignItems: "flex-start", gap: 14 }}>
            {(() => {
              // Reçete hesaplamasının yapıldığı renge özel görsel varsa o, yoksa ürünün genel kapak
              // resmi kullanılır — böylece PDF, hangi renk için hesaplandığını görsel olarak da gösterir.
              const receteResmi = (product.renkResimleri || {})[receteVarRenk] || product.kapakResmi;
              return receteResmi ? (
                <img
                  src={receteResmi}
                  alt={product.ad}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: "var(--erp-r-md)", border: "1px solid #E4D8C0", flexShrink: 0 }}
                />
              ) : null;
            })()}
            <div>
              <div><b>Ürün:</b> {product.ad}</div>
              <div><b>Birim:</b> {product.birim}</div>
              {receteVarRenk && <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 4 }}>Hammadde miktarları {receteVarRenk} rengi üzerinden hesaplanmıştır.</div>}
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hammaddeler</div>
          {hammaddeSatirlari.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 14 }}>Reçete kaydı yok.</div>
          ) : (
            <table style={{ width: "100%", marginBottom: 18 }}>
              <thead>
                {/* FİYAT SÜTUNLARI KALDIRILDI (kullanıcı, 21 Eylül: "reçetedeki yazdır kurları TL
                    çekiyor... fiyatları kaldırabiliriz, maliyette var"). Reçete atölyeye gider:
                    ne kadar malzeme. Fiyat "Maliyet Yazdır"da, seçili para biriminde. */}
                <tr><th>Proses</th><th>Hammadde</th><th>Renk</th><th>Miktar</th></tr>
              </thead>
              <tbody>
                {hammaddeSatirlari.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{s.proses}</td>
                    <td style={{ fontSize: 12 }}>{s.hammaddeAd}</td>
                    <td style={{ fontSize: 12 }}>{s.renk}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{s.miktar} {s.birim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>İşçilik</div>
          {isciligSatirlari.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 14 }}>İşçilik kaydı yok.</div>
          ) : (
            <table style={{ width: "100%", marginBottom: 18 }}>
              <thead>
                <tr><th>Proses</th></tr>
              </thead>
              <tbody>
                {isciligSatirlari.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{s.proses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <StitchDivider />

          <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Fiyat ve maliyet bilgisi ayrı: Ürün kartı › Maliyet › Yazdır.</div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, padding: "0 28px 24px" }}>
          <button className="btn-primary" onClick={() => indirYazdirilabilirHTML(".yazdir-alani", `Recete-${product.ad}`)}><Printer size={14} /> Yazdır / PDF İndir</button>
          {onMinimize && (
            <button className="btn-ghost" onClick={onMinimize} title="Sekmede bırak, kapatma">
              <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}><X size={14} /> Kapat</button>
        </div>
      </div>
    </div>
  );
}

// Bir teslimat/tahsilat fişini (Alış ya da Satış), müşteriye/tedarikçiye gönderilebilecek şekilde,
// ürün resimli ve renk×beden matrisi düzeninde yazdırılabilir bir belge olarak gösterir.
function FisYazdir({ fis, siparis, cari, stok, onClose, onMinimize, firmaBilgileri }) {
  // Basım anı SAATLİ: aynı gün birden çok kez basılan bir belgede hangisinin güncel olduğu
// yalnızca günle anlaşılmıyordu.
  const bugun = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  const tipRenk = siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)";

  // Muhasebe defterinde aynı fişte hem Genel hem Resmi kaydı oluşabilir (aynı tutar) — çift saymamak
  // için tekilleştiriyoruz.
  const gorulmusImzalar = new Set();
  const tekilHareketler = fis.hareketler.filter((h) => {
    const imza = `${h.tutar}|${h.urunAd || ""}|${h.renk || ""}|${h.beden || ""}|${h.miktar || ""}`;
    if ((h.defter || "Genel") === "Resmi" && gorulmusImzalar.has(imza)) return false;
    gorulmusImzalar.add(imza);
    return true;
  });

  // Ürün + renk bazında grupla, her grup için bedenleri matris sütunu yap.
  const urunRenkGruplari = [];
  const grupIndex = {};
  const tumBedenlerSet = new Set();
  tekilHareketler.forEach((h) => {
    if (!h.urunAd) return;
    const key = `${h.urunAd}__${h.renk}`;
    if (!(key in grupIndex)) {
      grupIndex[key] = urunRenkGruplari.length;
      const urun = (stok || []).find((p) => p.ad === h.urunAd);
      const gorsel = urun ? ((urun.renkResimleri || {})[h.renk] || urun.kapakResmi) : null;
      urunRenkGruplari.push({ key, urunAd: h.urunAd, renk: h.renk, birim: h.birim, gorsel, bedenler: {}, satirlar: [] });
    }
    urunRenkGruplari[grupIndex[key]].satirlar.push(h);
    urunRenkGruplari[grupIndex[key]].bedenler[h.beden] = (urunRenkGruplari[grupIndex[key]].bedenler[h.beden] || 0) + h.miktar;
    tumBedenlerSet.add(h.beden);
  });
  const tumBedenler = Array.from(tumBedenlerSet);

  // SATIR BAZLI BİRİM FİYAT VE PARA BİRİMİ.
  // Fiş kalem kalem yazıldığı için her hareket kendi birim fiyatını ve para birimini taşıyor.
  // Bir satırda (model+renk) bedenler farklı fiyatlanabilir; o durumda tek bir sayı yazmak
  // yanlış olurdu, "karışık" denir ve toplam yine doğru kalır.
  const satirFiyatBilgisi = (g) => {
    const fiyatlar = Array.from(new Set(g.satirlar.map((h) => h.birimFiyat || 0)));
    const paraBirimleri = Array.from(new Set(g.satirlar.map((h) => h.paraBirimi || "TRY")));
    const tutar = g.satirlar.reduce((t, h) => t + (h.tutar || 0), 0);
    const sembol = paraBirimleri.length === 1 ? (PARA_SEMBOLU[paraBirimleri[0]] || paraBirimleri[0]) : "";
    return {
      sembol,
      karisikPB: paraBirimleri.length > 1,
      birimFiyat: fiyatlar.length === 1 ? fiyatlar[0] : null,
      tutar,
    };
  };

  // Toplam para birimine göre ayrılır: farklı para birimlerindeki tutarları toplayıp tek sembolle
  // yazmak, olmayan bir kur çevrimi yapmış gibi görünürdü.
  const pbToplam = {};
  tekilHareketler.forEach((h) => {
    const pb = h.paraBirimi || "TRY";
    pbToplam[pb] = (pbToplam[pb] || 0) + (h.tutar || 0);
  });

  const toplamAdet = urunRenkGruplari.reduce((s, g) => s + Object.values(g.bedenler).reduce((a, b) => a + b, 0), 0);

  return (
    <div
      style={{
        // Sekme şeridi ekranın üstünü kapladığından pencere onun ALTINDAN başlar; aksi halde
        // pencerenin kapat/küçült bölgesi şeridin altında kalıp erişilemez oluyordu.
        position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
        zIndex: 100, background: "rgba(34,27,20,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 820, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div className="yazdir-alani" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(firmaBilgileri || {}).logo && (
                <img src={firmaBilgileri.logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
              )}
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#3A291D" }}>
                  {(firmaBilgileri || {}).unvan || "Atölye ERP"}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: tipRenk }}>
                  {siparis.tip === "Alış" ? "ALIŞ FİŞİ / İRSALİYE" : "SATIŞ FİŞİ / İRSALİYE"}
                </div>
                {(firmaBilgileri || {}).telefon && <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{firmaBilgileri.telefon}</div>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", textAlign: "right" }}>
              <div>Fiş No: <span className="mono" style={{ fontWeight: 700, color: "#3A291D" }}>{fis.fisNo || "—"}</span></div>
              {/* SAAT DE YAZILIR. `tarihYaz` saat VARSA gösterir, gün damgasında göstermez — bu
                  yüzden olmayan bir saat uydurulmuş olmuyor. Aynı gün birden çok fiş kesildiğinde
                  yalnızca gün yazmak, elde iki kâğıt varken hangisinin sonra kesildiğini
                  belirsiz bırakıyordu. */}
              <div>Tarih: <span className="mono">{fis.tarih ? tarihYaz(fis.zaman || fis.tarih) : bugun}</span></div>
              <div>Sipariş: <span className="mono">{siparis.siparisNo}</span></div>
            </div>
          </div>

          <StitchDivider color={tipRenk} />

          <div style={{ marginBottom: 16, fontSize: 13 }}>
            <div><b>{siparis.tip === "Alış" ? "Tedarikçi" : "Müşteri"}:</b> {cari ? cari.unvan : "—"}</div>
            {cari && cari.telefon && <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{cari.telefon}</div>}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 12, padding: "6px 8px", borderBottom: "2px solid #C9B99A" }}>Ürün / Renk</th>
                  {tumBedenler.map((b) => (
                    <th key={b} className="mono" style={{ fontSize: 12, textAlign: "center", padding: "6px 8px", borderBottom: "2px solid #C9B99A" }}>{b}</th>
                  ))}
                  <th className="mono" style={{ fontSize: 12, textAlign: "center", padding: "6px 8px", borderBottom: "2px solid #C9B99A" }}>Toplam</th>
                  <th className="mono" style={{ fontSize: 12, textAlign: "right", padding: "6px 8px", borderBottom: "2px solid #C9B99A", borderLeft: "1px dashed #C9B99A" }}>Birim Fiyat</th>
                  <th className="mono" style={{ fontSize: 12, textAlign: "right", padding: "6px 8px", borderBottom: "2px solid #C9B99A" }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {urunRenkGruplari.map((g) => {
                  const satirToplam = Object.values(g.bedenler).reduce((a, b) => a + b, 0);
                  const fiyat = satirFiyatBilgisi(g);
                  return (
                    <tr key={g.key}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #E4D8C0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ColorSwatch src={g.gorsel} editable={false} size={32} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#3A291D" }}>{g.urunAd}</div>
                            <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{g.renk}</div>
                          </div>
                        </div>
                      </td>
                      {tumBedenler.map((b) => (
                        <td key={b} className="mono" style={{ fontSize: 12, textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #E4D8C0" }}>
                          {g.bedenler[b] || "—"}
                        </td>
                      ))}
                      <td className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #E4D8C0" }}>
                        {satirToplam} {g.birim}
                      </td>
                      <td className="mono" style={{ fontSize: 12, textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #E4D8C0", borderLeft: "1px dashed #C9B99A", whiteSpace: "nowrap" }}>
                        {fiyat.birimFiyat == null
                          ? <span style={{ color: "var(--erp-text-2)" }}>karışık</span>
                          : `${fiyat.birimFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${fiyat.sembol}`}
                      </td>
                      <td className="mono" style={{ fontSize: 12, fontWeight: 600, textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #E4D8C0", whiteSpace: "nowrap" }}>
                        {fiyat.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {fiyat.sembol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <StitchDivider color={tipRenk} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13 }}>
            <div>Toplam Adet: <span className="mono" style={{ fontWeight: 700 }}>{toplamAdet}</span></div>
            <div>
              Toplam Tutar:{" "}
              {Object.entries(pbToplam).map(([pb, t], i) => (
                <span key={pb} className="mono" style={{ fontWeight: 700, marginLeft: i ? 10 : 0 }}>
                  {t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pb] || pb}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, padding: "0 28px 24px" }}>
          <button className="btn-primary" style={{ background: tipRenk }} onClick={() => indirYazdirilabilirHTML(".yazdir-alani", `Fis-${fis.fisNo || "belge"}`)}><Printer size={14} /> Yazdır</button>
          {/* PAYLAŞ ŞERİDİ (13 Eylül): fişi PDF olarak indir / WhatsApp / E-posta — ekrandaki belge alanından. */}
          <PaylasSeridi
            govdeSecici=".yazdir-alani"
            dosyaAdi={`${fis.fisNo || "fis"} - ${(cari && cari.unvan) || "cari"}`}
            cari={cari}
            konu={`${fis.tip || "Fiş"} ${fis.fisNo || ""} — ${(firmaBilgileri && firmaBilgileri.unvan) || ""}`.trim()}
            ozet={`${fis.tip || "Fiş"} ${fis.fisNo || ""}\n${(cari && cari.unvan) || ""}`}
            firmaBilgileri={firmaBilgileri}
          />
          {onMinimize && (
            <button className="btn-ghost" onClick={onMinimize} title="Sekmede bırak, kapatma">
              <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}><X size={14} /> Kapat</button>
        </div>
      </div>
    </div>
  );
}

function CariEkstre({ cari, onClose, onMinimize, firmaBilgileri, defterFiltre }) {
  // Hangi defter sekmesindeyken "Ekstre Yazdır" tıklandıysa, ekstre SADECE o defterin hareketlerini
  // gösterir — "Tümü" ise (ya da hiç belirtilmediyse) tüm hareketler dahil edilir. "Muhasebe" defteri
  // "Muhasebe" seçilerek eklenen hareket TEK satırdır ve İKİ deftere birden girer; süzme bu
  // yüzden `defterKapsar`dan geçiyor. (Eskiden kayıt ikiye bölündüğü için düz eşleşme yetiyordu;
  // bölme kaldırılınca bu satır da değişmek zorundaydı — yoksa ekstrede Muhasebe kayıtları
  // hiçbir defterde görünmezdi.)
  const filtreliHareketlerKaynagi = (!defterFiltre || defterFiltre === "Tümü")
    ? (cari.hareketler || [])
    : (cari.hareketler || []).filter((h) => defterKapsar(h.defter, defterFiltre));
  const siraliHareketler = [...filtreliHareketlerKaynagi].sort((a, b) => {
    const ta = new Date(a.tarih).getTime() || 0;
    const tb = new Date(b.tarih).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return (a.fisNo || "").localeCompare(b.fisNo || "", "tr", { numeric: true });
  });

  // Aynı fiş no'daki hareketleri tek satırda birleştirir (kronolojik sıra korunarak).
  const gruplar = [];
  const grupIndex = {};
  siraliHareketler.forEach((h) => {
    const key = h.fisNo ? `fis__${h.fisNo}` : `tek__${h.id}`;
    if (!(key in grupIndex)) {
      grupIndex[key] = gruplar.length;
      gruplar.push({ key, fisNo: h.fisNo, tarih: h.tarih, hareketler: [] });
    }
    gruplar[grupIndex[key]].hareketler.push(h);
  });

  // Koşan bakiye, HER PARA BİRİMİ İÇİN AYRI takip edilir — farklı para birimlerindeki hareketleri
  // tek bir toplamda birleştirmek matematiksel olarak yanlış olur (1 USD ≠ 1 ₺). Her fiş grubunun
  // kendi para birimi, o gruptaki İLK hareketten alınır (bir fiş genelde tek para biriminde olur).
  const kosanBakiyeler = {};
  const satirlar = gruplar.map((g) => {
    const grupPB = (g.hareketler[0] && g.hareketler[0].paraBirimi) || "TRY";
    const grupBorc = g.hareketler.filter((h) => h.yon === "Borç").reduce((s, h) => s + h.tutar, 0);
    const grupAlacak = g.hareketler.filter((h) => h.yon !== "Borç").reduce((s, h) => s + h.tutar, 0);
    kosanBakiyeler[grupPB] = (kosanBakiyeler[grupPB] || 0) + grupBorc - grupAlacak;
    const kosanBakiye = kosanBakiyeler[grupPB];
    const urunGruplari = urunRenkGrupla(g.hareketler);
    const yapisizHareketler = g.hareketler.filter((h) => !h.urunAd);
    return { ...g, urunGruplari, yapisizHareketler, grupBorc, grupAlacak, kosanBakiye, grupPB };
  });
  // Toplam Borç/Alacak/Bakiye de aynı sebeple para birimine göre AYRI AYRI hesaplanır — sadece TEK bir
  // para birimi varsa tek satır, birden fazlaysa her biri kendi satırında gösterilir.
  const pbToplamlari = {};
  siraliHareketler.forEach((h) => {
    const pb = h.paraBirimi || "TRY";
    if (!pbToplamlari[pb]) pbToplamlari[pb] = { borc: 0, alacak: 0 };
    if (h.yon === "Borç") pbToplamlari[pb].borc += h.tutar;
    else pbToplamlari[pb].alacak += h.tutar;
  });
  // Basım anı SAATLİ: aynı gün birden çok kez basılan bir belgede hangisinin güncel olduğu
// yalnızca günle anlaşılmıyordu.
  const bugun = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div
      style={{
        // Sekme şeridi ekranın üstünü kapladığından pencere onun ALTINDAN başlar; aksi halde
        // pencerenin kapat/küçült bölgesi şeridin altında kalıp erişilemez oluyordu.
        position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
        zIndex: 100, background: "rgba(34,27,20,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div id="ekstre-yazdir-alani" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(firmaBilgileri || {}).logo && (
                <img src={firmaBilgileri.logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
              )}
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#3A291D" }}>
                  {(firmaBilgileri || {}).unvan || "Atölye ERP"}
                </div>
                <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                  Cari Hesap Ekstresi{defterFiltre && defterFiltre !== "Tümü" ? ` — ${defterFiltre} Defteri` : ""}
                </div>
                {(firmaBilgileri || {}).telefon && <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{firmaBilgileri.telefon}</div>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", textAlign: "right" }}>
              Ekstre Tarihi: <span className="mono">{bugun}</span>
            </div>
          </div>

          <StitchDivider />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18, fontSize: 13 }}>
            <div><b>Unvan:</b> {cari.unvan}</div>
            <div><b>Tip:</b> {cari.tip}</div>
            {cari.telefon && <div><b>Telefon:</b> {cari.telefon}</div>}
            {cari.vergiNo && <div><b>Vergi No:</b> {cari.vergiNo}</div>}
            {cari.adres && <div style={{ gridColumn: "1 / -1" }}><b>Adres:</b> {cari.adres}</div>}
          </div>

          {satirlar.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--erp-text-3)", fontSize: 13 }}>Hareket kaydı yok.</div>
          ) : (
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Fiş No</th><th>Tarih</th><th>Açıklama</th><th>Borç</th><th>Alacak</th><th>Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((g) => (
                  <tr key={g.key}>
                    <td className="mono" style={{ fontSize: 12 }}>{g.fisNo || "—"}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{tarihYaz(g.tarih, true)}</td>
                    <td style={{ fontSize: 12 }}>
                      {g.urunGruplari.map((ug) => (
                        <div key={ug.key} style={{ marginBottom: 2 }}>
                          <b>{ug.urunAd}</b> · {ug.renk} — {ug.items.map((h) => `${h.beden}:${h.miktar}`).join(", ")} {ug.birim}
                        </div>
                      ))}
                      {g.yapisizHareketler.map((h) => (
                        <div key={h.id}>{h.aciklama || "—"}</div>
                      ))}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--erp-warn)" }}>
                      {g.grupBorc > 0 ? `${g.grupBorc.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[g.grupPB] || g.grupPB}` : ""}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--erp-primary)" }}>
                      {g.grupAlacak > 0 ? `${g.grupAlacak.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[g.grupPB] || g.grupPB}` : ""}
                    </td>
                    <td className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {g.kosanBakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[g.grupPB] || g.grupPB}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <StitchDivider />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13, flexWrap: "wrap" }}>
            {Object.keys(pbToplamlari).length === 0 ? (
              <div>Bakiye: <span className="mono" style={{ fontWeight: 700 }}>0 ₺</span></div>
            ) : (
              Object.entries(pbToplamlari).map(([pb, t]) => {
                const sembol = PARA_SEMBOLU[pb] || pb;
                const pbBakiye = t.borc - t.alacak;
                return (
                  <div key={pb} style={{ display: "flex", gap: 24 }}>
                    <div>Toplam Borç ({pb}): <span className="mono" style={{ fontWeight: 600, color: "var(--erp-warn)" }}>{t.borc.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</span></div>
                    <div>Toplam Alacak ({pb}): <span className="mono" style={{ fontWeight: 600, color: "var(--erp-primary)" }}>{t.alacak.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</span></div>
                    <div>Bakiye ({pb}): <span className="mono" style={{ fontWeight: 700 }}>{pbBakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</span></div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, padding: "0 28px 24px", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => indirYazdirilabilirHTML("#ekstre-yazdir-alani", `Ekstre-${cari.unvan}`)}><Printer size={14} /> Yazdır</button>
          {/* PAYLAŞ ŞERİDİ (13 Eylül): eski "WhatsApp'ta Paylaş / E-posta ile Gönder" (yalnız metin özeti)
              yerine PDF ekli paylaşım — sipariş ve fişle aynı bileşen. */}
          {(() => {
            const pbSatirlari = Object.entries(pbToplamlari)
              .map(([pb, t]) => `${pb}: Borç ${t.borc.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}, Alacak ${t.alacak.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}, Bakiye ${(t.borc - t.alacak).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`)
              .join("\n");
            return (
              <PaylasSeridi
                govdeSecici="#ekstre-yazdir-alani"
                dosyaAdi={`Ekstre - ${cari.unvan}`}
                cari={cari}
                konu={`Cari Hesap Ekstresi — ${cari.unvan}`}
                ozet={`Cari Hesap Ekstresi${defterFiltre && defterFiltre !== "Tümü" ? ` (${defterFiltre})` : ""}\n${cari.unvan}\nTarih: ${bugun}\n\n${pbSatirlari || "Hareket kaydı yok"}`}
                firmaBilgileri={firmaBilgileri}
              />
            );
          })()}
          {onMinimize && (
            <button className="btn-ghost" onClick={onMinimize} title="Sekmede bırak, kapatma">
              <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}><X size={14} /> Kapat</button>
        </div>
      </div>
    </div>
  );
}

/* ================= ÜRETİM MODÜLÜ ================= */

// Personel, fiziksel barkod kartını okutarak (ya da kodu elle girerek) kendi bağlı olduğu proseste
// bekleyen (kalan miktarı olan, sırası gelmiş) üretim işlerini görüp, ne kadarını üstleneceğini
// (miktar) girerek kendine iş atayabilir. Böylece atölye zemininde hızlı, kağıtsız bir iş dağıtımı olur.
// =============================================================================================
// ATÖLYE EKRANI — okuma yazma gerektirmeyen üretim ekranı
//
// Atölyede okuma yazma bilmeyen ve Türkçe okuyamayan personel çalışıyor. Bu ekran onlar için:
// hiçbir adımda metin OKUMAK zorunlu değil. Bilgi şu kanallardan taşınır:
//
//   FOTOĞRAF   — kişinin kendi resmi, ürünün resmi, rengin resmi. Tanıma okumadan olur.
//   RAKAM      — sayılar okuma yazma bilmeyenlerce de bilinir (para, beden, adet).
//   RENK       — yeşil = tamam, sarı = tamir, kırmızı = bozuk. Trafik ışığı mantığı evrensel.
//   İKON       — ✓ / anahtar / çöp kutusu. Metinle DEĞİL, ikonla anlatılır.
//
// Metin yine yazılır (Türkçe okuyabilenler için) ama hiçbir yerde TEK bilgi kaynağı değildir.
//
// Akış üç adım, her ekranda TEK karar:
//   1) Kim? → kendi fotoğrafına dokun
//   2) Hangi iş? → ürün fotoğrafı + renk + rakamlarla iş kartları
//   3) Kaç tane? → büyük +/− ile sayı, sonra üç renkli düğmeyle sonuç
// Teslim fişi içeriği. Personelin elinde kalan kanıt ve ofis için kayıt: kim, ne, kaç tane,
// ne kadar hak etti. Rakamlar büyük — atölye ışığında ve çoğu zaman ayakta okunuyor.
function teslimFisiHTML({ personelAdi, urunAd, renk, proses, sonuc, atamaMiktar, ucret, fisNo }) {
  const saglamToplam = Object.values(sonuc.saglam || {}).reduce((t, x) => t + x, 0);
  const tamirToplam = (sonuc.tamir || []).reduce((t, x) => t + x.miktar, 0);
  const hurdaToplam = (sonuc.hurda || []).reduce((t, x) => t + x.miktar, 0);
  const bedenSatirlari = Object.entries(sonuc.saglam || {})
    .map(([b, m]) => `<tr><td>${b}</td><td class="sag">${m}</td></tr>`).join("");
  const tarih = new Date();
  const zaman = `${String(tarih.getDate()).padStart(2, "0")}.${String(tarih.getMonth() + 1).padStart(2, "0")}.${tarih.getFullYear()} ${String(tarih.getHours()).padStart(2, "0")}:${String(tarih.getMinutes()).padStart(2, "0")}`;
  return `
    <div class="baslik">${personelAdi}</div>
    <div class="orta" style="font-size:11px">${zaman}${fisNo ? ` · ${fisNo}` : ""}</div>
    <div class="cizgi"></div>
    <div class="satir"><span>${urunAd}</span><span>${renk}</span></div>
    <div class="orta buyuk">${proses}</div>
    <div class="cizgi"></div>
    <table>${bedenSatirlari}</table>
    <div class="cizgi"></div>
    <div class="satir"><span>SAGLAM</span><span class="buyuk">${saglamToplam}</span></div>
    ${tamirToplam > 0 ? `<div class="satir"><span>TAMIR</span><span class="buyuk">${tamirToplam}</span></div>` : ""}
    ${hurdaToplam > 0 ? `<div class="satir"><span>HURDA</span><span class="buyuk">${hurdaToplam}</span></div>` : ""}
    <div class="cizgi"></div>
    <div class="satir"><span>VERILEN</span><span>${atamaMiktar}</span></div>
    ${ucret > 0 ? `<div class="satir"><span>UCRET</span><span class="buyuk">${ucret} TL</span></div>` : ""}
    <div class="cizgi"></div>
    <div class="orta" style="font-size:11px">imza</div>
    <div style="height:10mm"></div>
  `;
}


// ================= MALİYET YAZDIR =================
//
// Kullanıcı (21 Eylül): "Maliyet yazdır ekranı olsun, hangi fiyat birimi seçili ise o halde
// yazdırsın." Ürün kartı › Maliyet sekmesindeki dökümün kâğıt hali: satırlar kendi biriminde +
// TL + seçili birim, para birimi dağılımı, sağa yaslı özet (hammadde, işçilik, genel gider, tam
// maliyet, kâr, toplam fiyat) ve o gruba kayıtlı fiyatlar. Reçete yazdırmada artık fiyat yok;
// fiyat burada.
//
// Hesap ürün kartıyla AYNI yardımcılardan (alisFiyatiTL, alisPbKodu); ikinci bir formül yok.
function MaliyetYazdir({ product, tumUrunler, tanimlarProsesler, tanimlarAraProsesler, kurlar,
  aylikUretimHedefi, genelGiderler, fiyatGruplari, onClose, onMinimize, firmaBilgileri }) {
  const bugun = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  const PB_SIMGE = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };
  const istenen = product.maliyetBirimi || "TRY";
  const hedefKur = istenen === "TRY" ? 1 : parseFloat((kurlar || {})[istenen]) || 0;
  const hedefPb = hedefKur > 0 ? istenen : "TRY";
  const hedefe = (tl) => (hedefPb === "TRY" ? tl : tl / hedefKur);
  const para = (v, pb) => `${(Math.round((v || 0) * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PB_SIMGE[pb] || pb}`;
  const yaz = (tl) => para(hedefe(tl), hedefPb);

  // Satırlar (ürün kartıyla aynı gruplama)
  const renkler = Array.from(new Set((product.variants || []).map((v) => v.renk)));
  const receteVarRenk = renkler.find((mr) => (product.recete || []).some((r) => r.mamulRenk === mr));
  const satirlar = [];
  let hammaddeToplami = 0;
  const dagilim = {};
  if (receteVarRenk) {
    const ilgili = product.recete.filter((r) => r.mamulRenk === receteVarRenk);
    receteProsesGrupla(ilgili, tanimlarProsesler, product.receteProsesSirasiOverride).forEach((pg) => {
      receteMaliyetGrupla(pg.satirlar).forEach((g) => {
        const hammadde = (tumUrunler || []).find((p) => p.id === g.satirlar[0].hammaddeUrunId);
        const miktar = g.satirlar[0].miktar || 0;
        // Renk ve boy dahil (21 Eylül) — ürün kartıyla aynı yardımcı.
        const bf = hammaddeBirimFiyati(hammadde, g.satirlar[0].renk, g.satirlar[0].beden, kurlar);
        const tl = miktar * bf.tl;
        const pb = bf.pb;
        const kendiFiyat = bf.kendiFiyat;
        hammaddeToplami += tl;
        if (!dagilim[pb]) dagilim[pb] = { kendi: 0, tl: 0 };
        dagilim[pb].kendi += kendiFiyat * miktar; dagilim[pb].tl += tl;
        satirlar.push({ proses: pg.proses, ad: hammadde ? hammadde.ad : (g.hammaddeAd || "?"), renk: g.renk || "", boy: g.satirlar[0].beden || "",
          miktar, birim: g.satirlar[0].birim || (hammadde && hammadde.birim) || "", pb, kendiFiyat, kendiTutar: kendiFiyat * miktar, tl });
      });
    });
  }
  // İşçilik
  const iscilik = Object.entries(product.prosesUcretleri || {}).filter(([, u]) => (u || 0) > 0).map(([p, u]) => ({ proses: p, ucret: u }));
  Object.entries(product.araProsesEklentileri || {}).forEach(([anaProses, apId]) => {
    if (!apId) return;
    const ap = (tanimlarAraProsesler || []).find((x) => x.id === apId);
    const ucret = (product.araProsesUcretleri || {})[apId] != null ? product.araProsesUcretleri[apId] : (ap ? (ap.ucret || 0) : 0);
    if (ucret > 0) iscilik.push({ proses: `${ap ? ap.ad : apId} (${anaProses} sonrası)`, ucret });
  });
  const isciligToplami = iscilik.reduce((t, x) => t + x.ucret, 0);
  const hedefAdet = parseFloat(aylikUretimHedefi) || 0;
  const aylikGenel = (genelGiderler || []).reduce((t, k) => t + (parseFloat(k.aylikTutar) || 0), 0);
  // Ürüne özel çift başı genel gider varsa o (ürün kartıyla aynı kural, 21 Eylül).
  const ozelGenel = product.genelGiderCiftBasi != null && product.genelGiderCiftBasi !== "" ? parseFloat(product.genelGiderCiftBasi) : null;
  const ciftBasiGenel = ozelGenel != null && !Number.isNaN(ozelGenel) ? ozelGenel : (hedefAdet > 0 ? aylikGenel / hedefAdet : 0);
  const tamMaliyet = hammaddeToplami + isciligToplami + ciftBasiGenel;
  const marj = product.karMarji != null && !Number.isNaN(parseFloat(product.karMarji)) ? parseFloat(product.karMarji) : 30;
  const satisFiyati = tamMaliyet * (1 + marj / 100);
  // Kayıtlı grup fiyatları
  const grupFiyatlari = (product.fiyatKurallari || []).filter((k) => k.tip === "Satış" && k.kapsam === "fiyatGrubu" && !k.renk && !k.beden)
    .map((k) => ({ ad: ((fiyatGruplari || []).find((g) => g.id === k.deger) || {}).ad || k.etiket || k.deger, fiyat: k.fiyat, pb: k.paraBirimi || "TRY" }));
  if (parseFloat(product.satisFiyati) > 0) grupFiyatlari.unshift({ ad: "Genel", fiyat: parseFloat(product.satisFiyati), pb: alisPbKodu({ alisParaBirimi: product.satisParaBirimi }) });

  const th = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", padding: "5px 8px", borderBottom: "2px solid #C8BCAC", textAlign: "right" };
  const td = { fontSize: 12, padding: "4px 8px", borderBottom: "1px solid #E0D6C7", textAlign: "right" };

  return (
    <div style={{ position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
      zIndex: 100, background: "rgba(34,27,20,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 820, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div className="yazdir-alani" data-maliyet-yazdir="1" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(firmaBilgileri || {}).logo && <img src={firmaBilgileri.logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />}
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#3A291D" }}>{(firmaBilgileri || {}).unvan || "Atölye ERP"}</div>
                <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Ürün Maliyeti · {PB_SIMGE[hedefPb]} {hedefPb}{hedefPb !== "TRY" ? ` · 1 ${PB_SIMGE[hedefPb]} = ${para(hedefKur, "TRY")}` : ""}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", textAlign: "right" }}>
              Tarih: <span className="mono">{bugun}</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3A291D", marginTop: 4 }}>{product.ad}{product.kod ? ` · ${product.kod}` : ""}</div>
              {receteVarRenk && <div style={{ fontSize: 11 }}>Reçete rengi: {receteVarRenk}</div>}
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Hammadde</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Proses</th><th style={{ ...th, textAlign: "left" }}>Hammadde</th>
              <th style={th}>Miktar</th><th style={th}>Birim fiyat</th><th style={th}>Tutar (kendi)</th><th style={th}>TL</th>
              {hedefPb !== "TRY" && <th style={th}>{PB_SIMGE[hedefPb]}</th>}
            </tr></thead>
            <tbody>
              {satirlar.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: "left" }}>{r.proses}</td>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{r.ad}{r.renk ? ` · ${r.renk}` : ""}{r.boy ? ` · ${r.boy}` : ""}</td>
                  <td className="mono" style={td}>{(Math.round(r.miktar * 1000) / 1000).toLocaleString("tr-TR")} {r.birim}</td>
                  <td className="mono" style={td}>{para(r.kendiFiyat, r.pb)}</td>
                  <td className="mono" style={td}>{para(r.kendiTutar, r.pb)}</td>
                  <td className="mono" style={td}>{para(r.tl, "TRY")}</td>
                  {hedefPb !== "TRY" && <td className="mono" style={{ ...td, fontWeight: 600 }}>{para(hedefe(r.tl), hedefPb)}</td>}
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td style={{ ...td, textAlign: "left" }} colSpan={5}>Hammadde toplamı</td>
                <td className="mono" style={td}>{para(hammaddeToplami, "TRY")}</td>
                {hedefPb !== "TRY" && <td className="mono" style={td}>{para(hedefe(hammaddeToplami), hedefPb)}</td>}
              </tr>
            </tbody>
          </table>
          {Object.keys(dagilim).length > 1 && (
            <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 14 }}>
              Para birimi dağılımı: {Object.entries(dagilim).sort((a, b) => b[1].tl - a[1].tl).map(([pb, v]) =>
                `${para(v.kendi, pb)}${pb !== "TRY" ? ` (${para(v.tl, "TRY")})` : ""} · %${hammaddeToplami > 0 ? Math.round((v.tl / hammaddeToplami) * 100) : 0}`).join("   ")}
            </div>
          )}

          {iscilik.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>İşçilik</div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, maxWidth: 360 }}>
                <tbody>
                  {iscilik.map((s, i) => (
                    <tr key={i}><td style={{ ...td, textAlign: "left" }}>{s.proses}</td><td className="mono" style={td}>{yaz(s.ucret)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 16, rowGap: 4, maxWidth: 420, marginLeft: "auto", fontSize: 13 }}>
            <span>Hammadde</span><span className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{yaz(hammaddeToplami)}</span>
            <span>İşçilik</span><span className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{yaz(isciligToplami)}</span>
            <span>Genel gider (çift başı){hedefAdet > 0 ? <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}> · {yaz(aylikGenel)} / {hedefAdet} çift</span> : null}</span>
            <span className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{hedefAdet > 0 ? yaz(ciftBasiGenel) : "—"}</span>
            <span style={{ borderTop: "1px solid #C8BCAC", paddingTop: 4, fontWeight: 700 }}>Tam maliyet</span>
            <span className="mono" style={{ borderTop: "1px solid #C8BCAC", paddingTop: 4, textAlign: "right", fontWeight: 700 }}>{yaz(tamMaliyet)}</span>
            <span>Kâr %{marj}</span><span className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{yaz(satisFiyati - tamMaliyet)}</span>
            <span style={{ borderTop: "2px solid #24201b", paddingTop: 6, fontSize: 14, fontWeight: 700 }}>Toplam fiyat</span>
            <span className="mono" data-maliyet-yazdir-toplam="1" style={{ borderTop: "2px solid #24201b", paddingTop: 6, textAlign: "right", fontSize: 16, fontWeight: 700 }}>{yaz(satisFiyati)}</span>
          </div>

          {/* Kayıtlı satış fiyatları yazdırmadan KALDIRILDI (kullanıcı, 21 Eylül: "maliyet yazdırırken
              altta çıkan fiyat gruplarına gerek yok"). */}
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, padding: "0 28px 24px" }}>
          <button className="btn-primary" data-maliyet-yazdir-indir="1" onClick={() => indirYazdirilabilirHTML(".yazdir-alani", `Maliyet-${product.ad}-${hedefPb}`)}>
            <Printer size={14} /> Yazdır / İndir
          </button>
          {onMinimize && <button className="btn-ghost" onClick={onMinimize} title="Sekmede bırak, kapatma">Küçült</button>}
          <button className="btn-ghost" onClick={onClose}><X size={14} /> Kapat</button>
        </div>
      </div>
    </div>
  );
}
