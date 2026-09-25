// ================= KÂR / ZARAR =================
//
// Kullanıcı (17 Eylül): *"Kârlılığımızı kontrol edecek, giderleri listeleyecek... kartlar olması
// gerekli."* Gelir/gider kartları v1.322.0'da kuruldu; bu ekran onların meyvesi.
//
// HESAP — üç katman, muhasebenin gelir tablosu sırası:
//   Satış geliri                        satış fişlerinin tutarı
// − Satılan malın maliyeti (SMM)        satılan ürünün ALIŞ değeri
// = BRÜT KÂR
// − Giderler (gruplara göre)            gider kartlı kasa/banka çıkışları
// + Diğer gelir                         gelir kartlı girişler
// = NET KÂR
//
// SMM NEDEN YAKLAŞIK: gerçek maliyet muhasebede parti parti (FIFO/ortalama) izlenir; bizde ürünün
// KART ALIŞ FİYATI kullanılıyor. Atölye için yeterli — alış fiyatı zaten son alışlardan güncelleniyor
// ve kullanıcı kartta görüyor. Ekranda bu açıkça yazıyor: uydurulmuş bir kesinlik göstermek,
// yaklaşık olduğunu söylemekten kötü.
//
// DÖVİZ: tutarlar kendi para biriminde toplanıyor ve TL karşılığı kurla hesaplanıyor. Kur bugünün
// kuru; geçmiş dönemde işlem anındaki kur farklı olabilir. Bu da ekranda yazıyor.

function kzDonemAraligi(donem) {
  const bugun = new Date();
  const yil = bugun.getFullYear();
  const ay = bugun.getMonth();
  if (donem === "buAy") return { bas: new Date(yil, ay, 1), son: new Date(yil, ay + 1, 0, 23, 59, 59) };
  if (donem === "gecenAy") return { bas: new Date(yil, ay - 1, 1), son: new Date(yil, ay, 0, 23, 59, 59) };
  if (donem === "buYil") return { bas: new Date(yil, 0, 1), son: new Date(yil, 11, 31, 23, 59, 59) };
  return { bas: new Date(2000, 0, 1), son: new Date(2100, 0, 1) };
}

function kzTarihUygun(tarih, aralik) {
  if (!tarih) return false;
  const t = new Date(tarih);
  if (Number.isNaN(t.getTime())) return false;
  return t >= aralik.bas && t <= aralik.son;
}

// Tutarı TL'ye çevirir (kur yoksa olduğu gibi bırakır — sıfırlamak toplamı sessizce bozardı).
function kzTL(tutar, paraBirimi, kurlar) {
  const pb = paraBirimi || "TRY";
  if (pb === "TRY") return tutar || 0;
  const kur = (kurlar || {})[pb];
  return kur ? (tutar || 0) * kur : (tutar || 0);
}

// Dönemin kâr-zarar tablosunu kurar.
function karZararHesapla({ stok, cariler, muhasebe, giderKartlari, donem }) {
  const aralik = kzDonemAraligi(donem);
  const kurlar = (muhasebe && muhasebe.kurlar) || {};

  // ---- 1) SATIŞ GELİRİ ve SMM — stok hareketlerinden.
  // Cari hareketinden değil stok hareketinden okunuyor: fişin PARA ayağı cari defterinde,
  // MAL ayağı stokta. Satılan malın maliyetini bilmek için hangi üründen kaç adet çıktığı gerekiyor.
  let satisGeliri = 0;
  let smm = 0;
  const satisKalemleri = [];
  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (h.kaynak !== "Satış" || (h.miktar || 0) >= 0) return;
      if (!kzTarihUygun(h.tarih, aralik)) return;
      const adet = Math.abs(h.miktar || 0);
      const gelir = kzTL((h.birimFiyat || 0) * adet, h.paraBirimi, kurlar);
      // ALAN ADI DÜZELTİLDİ (20 Eylül): ürün kartı `alisParaBirimi` yazıyor, burada `alisPB`
      // okunuyordu — hiç eşleşmediği için dolarlık alış fiyatı TL sayılıyor, SMM 20-50 kat düşük
      // çıkıyordu. Aynı yardımcı (alisFiyatiTL) üç ekranda ortak.
      const maliyet = alisFiyatiTL(p, kurlar) * adet;
      satisGeliri += gelir;
      smm += maliyet;
      satisKalemleri.push({ urun: p.ad, renk: h.renk, beden: h.beden, adet, gelir, maliyet, tarih: h.tarih, fisNo: h.fisNo });
    });
  });

  // ---- 2) GİDERLER ve DİĞER GELİR — gider/gelir kartlı kasa/banka hareketlerinden.
  const kartAdi = {};
  (giderKartlari || []).forEach((k) => { kartAdi[k.id] = k; });
  const gruplar = {};
  let digerGelir = 0;
  let giderToplam = 0;
  const hesaplar = [...((muhasebe && muhasebe.kasalar) || []), ...((muhasebe && muhasebe.bankalar) || [])];
  hesaplar.forEach((hes) => {
    (hes.hareketler || []).forEach((h) => {
      if (!h.giderKartId || h.virmanMi) return;
      if (!kzTarihUygun(h.tarih, aralik)) return;
      const kart = kartAdi[h.giderKartId] || { ad: h.giderKartAd || "Bilinmeyen", grup: h.giderGrubu || "yonetim", tur: "gider" };
      const tutar = kzTL(h.tutar || 0, hes.paraBirimi, kurlar);
      if (h.yon === "Giriş") { digerGelir += tutar; return; }
      giderToplam += tutar;
      const anahtar = kart.grup || "yonetim";
      if (!gruplar[anahtar]) gruplar[anahtar] = { toplam: 0, kartlar: {} };
      gruplar[anahtar].toplam += tutar;
      gruplar[anahtar].kartlar[kart.ad] = (gruplar[anahtar].kartlar[kart.ad] || 0) + tutar;
    });
  });

  // ÜRETİM İŞÇİLİĞİ (kullanıcı, 20 Eylül: "üretim işçiliklerini bu kartlara bağlayabiliriz;
  // rapor alırken işçilik ödemeleri ve işçilik karşılıkları gibi rapor alabiliriz").
  //
  // İşçilik ücreti üretim sırasında personel carisine yazılıyor (`-İşçilik` fişi). Kâr-zarar
  // raporu bunu hiç saymıyordu; malın maliyeti yalnız hammadde sayılıyor, brüt kâr gerçekte
  // olduğundan YÜKSEK görünüyordu.
  //
  // NEDEN SMM'NİN İÇİNDE, AYRI BİR GİDER DEĞİL: işçilik malın üzerine biner — ayakkabı
  // kesilmeden, dikilmeden satılamaz. Kira gibi dönemsel bir gider değil, üretilen malın
  // parçasıdır. Muhasebede de 730 (Direkt İşçilik) satılan malın maliyetine girer.
  //
  // ÖLÇÜ CARİ HAREKETİ: işçilik ödenmiş olsun olmasın DOĞMUŞTUR; ödeme ayrı bir olaydır
  // (o da kasa tarafında görünür). "Karşılık" mantığı budur — hak edilen ücret, ödenmemiş bile
  // olsa o dönemin maliyetidir.
  let uretimIscilik = 0;
  const iscilikDetay = {};
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => {
      if (!h.fisNo || !/-İşçilik$/.test(h.fisNo)) return;
      // YÖNE BAKILMIYOR (v1.409.0): işçilik v1.408'e kadar yanlışlıkla "Borç", sonra doğru
      // yönde "Alacak" yazıldı. İkisi de aynı olayı (hak edilen ücret) anlatıyor; işçilik
      // fişinin geri alınması karşı kayıtla değil SİLMEYLE yapıldığı için ters yönlü bir
      // işçilik hareketi yok. Yöne bakmak eski kayıtları ya da yenileri rapordan düşürürdü.
      if (!kzTarihUygun(h.tarih, aralik)) return;
      const tutar = kzTL(h.tutar || 0, h.paraBirimi, kurlar);
      uretimIscilik += tutar;
      iscilikDetay[c.unvan] = (iscilikDetay[c.unvan] || 0) + tutar;
    });
  });

  const brutKar = satisGeliri - smm - uretimIscilik;
  const netKar = brutKar - giderToplam + digerGelir;
  return {
    aralik, satisGeliri, smm, uretimIscilik, iscilikDetay, brutKar, giderToplam, digerGelir, netKar,
    gruplar, satisKalemleri,
    // Gider kartı hiç yoksa kullanıcıya yol göstermek için.
    kartYok: (giderKartlari || []).length === 0,
  };
}

function KarZararPaneli({ stok, cariler, muhasebe, giderKartlari, tanimlar }) {
  const [donem, setDonem] = useState("buAy");
  const sonuc = karZararHesapla({ stok, cariler, muhasebe, giderKartlari, donem });
  const para = (v) => `${Math.round(v).toLocaleString("tr-TR")} ₺`;

  const satir = (etiket, deger, renk, kalin, ipucu) => (
    <div title={ipucu} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      borderBottom: "1px solid #F2E8D8", background: kalin ? "var(--erp-panel)" : "transparent" }}>
      <span style={{ flex: 1, fontSize: kalin ? 14 : 13, fontWeight: kalin ? 700 : 500, color: "var(--erp-text)" }}>{etiket}</span>
      <span className="mono" style={{ fontSize: kalin ? 15 : 13, fontWeight: 700, color: renk || "var(--erp-text)" }}>{para(deger)}</span>
    </div>
  );

  return (
    <div data-kar-zarar="1" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[{ k: "buAy", ad: "Bu ay" }, { k: "gecenAy", ad: "Geçen ay" }, { k: "buYil", ad: "Bu yıl" }, { k: "tumu", ad: "Tümü" }].map((d) => (
          <button key={d.k} type="button" data-kz-donem={d.k} onClick={() => setDonem(d.k)}
            style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${donem === d.k ? "var(--erp-primary)" : "var(--erp-border)"}`,
              background: donem === d.k ? "#4E6B4E1A" : "#fff", color: donem === d.k ? "var(--erp-primary)" : "var(--erp-text-2)" }}>
            {d.ad}
          </button>
        ))}
      </div>

      {sonuc.kartYok && (
        <div style={{ background: "#FFF4E6", border: "1px solid #E1A03F", borderRadius: "var(--erp-r-md)", padding: "10px 12px", fontSize: 12, color: "#7A5A28" }}>
          Gider kartı tanımlı değil: kira, elektrik, personel gibi kalemler hesaba girmiyor.
          Finans › Gelir / Gider ekranından ekleyin.
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
        {satir("Satış geliri", sonuc.satisGeliri, "var(--erp-primary)", false, "Dönemdeki satış fişlerinin tutarı")}
        {satir("− Satılan malın maliyeti", -sonuc.smm, "var(--erp-warn)", false, "Satılan ürünlerin kart alış fiyatıyla değeri (yaklaşık)")}
        {sonuc.uretimIscilik > 0 && satir("− Üretim işçiliği", -sonuc.uretimIscilik, "var(--erp-warn)", false,
          "Dönemde doğan işçilik ücretleri (ödenmiş olsun olmasın) — malın maliyetine girer")}
        {satir("= Brüt kâr", sonuc.brutKar, sonuc.brutKar >= 0 ? "var(--erp-primary-2)" : "var(--erp-danger)", true)}
        {satir("− Giderler", -sonuc.giderToplam, "var(--erp-warn)", false, "Gider kartına yazılan kasa/banka çıkışları")}
        {sonuc.digerGelir > 0 && satir("+ Diğer gelir", sonuc.digerGelir, "var(--erp-primary)", false, "Gelir kartına yazılan girişler")}
        {satir("= NET KÂR", sonuc.netKar, sonuc.netKar >= 0 ? "var(--erp-primary-2)" : "var(--erp-danger)", true)}
      </div>

      {/* İŞÇİLİK DÖKÜMÜ: kime ne kadar hak edildi (kullanıcı: "işçilik ödemeleri ve işçilik
          karşılıkları gibi rapor alabiliriz"). Doğan ücret ile ödenen ücret farklı şeyler —
          burada DOĞAN görünüyor, ödenen kasa tarafında. */}
      {sonuc.uretimIscilik > 0 && (
        <div data-iscilik-dokumu="1" style={{ background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#F6EEDD", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
            Üretim işçiliği — kime ne kadar hak edildi
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 12px" }}>
            {Object.entries(sonuc.iscilikDetay).sort((a2, b2) => b2[1] - a2[1]).map(([ad, tutar]) => (
              <span key={ad} className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)",
                border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-pill)", padding: "2px 9px" }}>
                {ad} · {para(tutar)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GİDER DÖKÜMÜ — grup grup, altında kartlar. "Nereye gitti" sorusunun cevabı. */}
      {sonuc.giderToplam > 0 && (
        <div style={{ background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#F6EEDD", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
            Giderlerin dağılımı
          </div>
          {giderGelirGruplari(tanimlar).filter((g) => sonuc.gruplar[g.key]).map((g) => {
            const veri = sonuc.gruplar[g.key];
            const oran = sonuc.giderToplam > 0 ? (veri.toplam / sonuc.giderToplam) * 100 : 0;
            return (
              <div key={g.key} data-kz-grup={g.key} style={{ borderBottom: "1px solid #F2E8D8", padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{g.ad}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>%{oran.toFixed(0)}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>{para(veri.toplam)}</span>
                </div>
                {/* Oran çubuğu: sayıyı okumadan da hangi grubun ağır bastığı görünsün. */}
                <div style={{ height: 4, background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-sm)", marginTop: 4 }}>
                  <div style={{ width: `${oran}%`, height: "100%", background: "var(--erp-warn)", borderRadius: "var(--erp-r-sm)" }} />
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  {Object.entries(veri.kartlar).sort((a, b) => b[1] - a[1]).map(([ad, tutar]) => (
                    <span key={ad} className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)",
                      border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-pill)", padding: "2px 9px" }}>
                      {ad} · {para(tutar)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--erp-text-3)", lineHeight: 1.5 }}>
        Satılan malın maliyeti ürünün <b>kart alış fiyatıyla</b> hesaplanıyor (parti bazlı gerçek
        maliyet değil) — atölye için yaklaşık ama tutarlı bir ölçü. Döviz tutarları <b>bugünkü
        kurla</b> TL'ye çevriliyor; geçmiş dönemde işlem anındaki kur farklı olabilir.
        Üretim maliyeti (işçilik, fire) henüz bu tabloda değil.
      </div>
    </div>
  );
}
