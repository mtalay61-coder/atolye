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
// `eksik` (Set, v1.538.0 — kullanıcı kararı): kuru olmayan para birimi buraya yazılır; rapor "şu tutarlar TL
// sayıldı" uyarısını gösterir. Önce uyarı yoktu — kur çekilemediğinde EUR/USD gelir-gider sessizce TL sayılıyordu.
function kzTL(tutar, paraBirimi, kurlar, eksik) {
  const pb = paraBirimi || "TRY";
  if (pb === "TRY") return tutar || 0;
  const kur = (kurlar || {})[pb];
  if (!kur && eksik && (tutar || 0) !== 0) eksik.add(pb);
  return kur ? (tutar || 0) * kur : (tutar || 0);
}

// Dönemin kâr-zarar tablosunu kurar.
// DEFTER (v1.543.0 — kullanıcı: "Resmi defter olmayan yer kaldı mı?" → "Diğerlerini yap"). `defter`
// "Genel"/"Resmi" verilirse her kalem kendi kaydının defterine göre süzülür (`defterKapsar`: Muhasebe
// ikisine de girer): satış geliri ve SMM satışın CARİ ayağının defterinden (stok hareketinde defter yok),
// gider/diğer gelir kasa-banka hareketinden, işçilik personel carisindeki hareketten. Cari ayağı olmayan
// eski satış Genel sayılır (fiş defterinin varsayılanı). Boş/"Tümü" = eskisi gibi hepsi.
function karZararHesapla({ stok, cariler, muhasebe, giderKartlari, donem, defter, uretim, tanimlar }) {
  const aralik = kzDonemAraligi(donem);
  const kapsar = (d) => defterKapsar(d, defter);
  const kurlar = (muhasebe && muhasebe.kurlar) || {};
  const kurEksik = new Set();

  // ---- 1) SATIŞ GELİRİ ve SMM — stok hareketlerinden.
  // Cari hareketinden değil stok hareketinden okunuyor: fişin PARA ayağı cari defterinde,
  // MAL ayağı stokta. Satılan malın maliyetini bilmek için hangi üründen kaç adet çıktığı gerekiyor.
  //
  // GELİR CARİ AYAĞINDAN (27 Eylül, v1.498.0). Rapor fiyatı stok hareketinin `birimFiyat`ından
  // okuyordu; `fisYaz` (078) ise fiyatı YALNIZ cari hareketine yazıyor — stok hareketinde fiyat hiç
  // yok. Sonuç: gerçek veride satış geliri 0, brüt ve net kâr eksi görünüyordu (senaryo tohumu stok
  // hareketine fiyat koyduğu için test yakalamadı; KDV çalışmasında fark edildi).
  // Fişin iki ayağı AYNI kimliği taşıyor (078: "Kimlik stok hareketiyle ORTAK") — mal stoktan (ürün,
  // adet → maliyet), para cariden (tutar → gelir) okunuyor. Eski fişler de böylece düzeliyor; göç yok.
  // KDV'li fişte gelir MATRAHTIR: KDV devlete ödenecek para, satışın geliri değil (cari `tutar`ı KDV dahil).
  // Cari ayağı bulunamazsa (çok eski/elle kayıt) stoktaki fiyat varsa o; o da yoksa gelir 0 ve satır
  // "fiyatı bulunamadı" sayılır — ekranda sayısı yazıyor, sessizce eksik göstermiyoruz.
  // SATILAN MALIN MALİYETİ (v1.499.0 — kullanıcı: "maliyet ilk olarak son hammadde rengin alış fiyatlarının
  // ortalamasından çeksin"). Önce yalnız kart alış fiyatı okunuyordu; üretilen mamulde o alan çoğu zaman
  // boş → SMM 0, brüt kâr şişkin. Artık:
  //   • Mamul: reçetedeki hammaddeler × son alış ortalaması (o renk; 077-alis-ortalama). İŞÇİLİK YOK —
  //     aşağıda "Üretim işçiliği" satırı ayrıca sayıyor; ikisini toplamak çift sayım olurdu.
  //     Reçetesi yoksa kart alış fiyatı (dışarıdan alınıp satılan mamul).
  //   • Hammadde vb. (doğrudan satılan): kendi son alış ortalaması → kural → kart.
  // Fiyat BUGÜNÜN maliyeti (satış günününki değil) — ekrandaki açıklama bunu söylüyor.
  // ALAN ADI (20 Eylül): kart `alisParaBirimi` yazıyor — `alisFiyatiTL` onu okuyor.
  const maliyetBaglami = { cariler, kurGecmisi: muhasebe && muhasebe.kurGecmisi };
  const birimMaliyetOnbellek = new Map();
  const kzBirimMaliyet = (p, h) => {
    const anahtar = `${p.id}|${stokAnahtarNrm(h.renk)}|${stokAnahtarNrm(h.beden)}`;
    if (birimMaliyetOnbellek.has(anahtar)) return birimMaliyetOnbellek.get(anahtar);
    let deger;
    // KUR EKSİĞİ MALİYETTE DE (v1.568.0, denetim): döviz fiyatlı malın kuru yoksa maliyet TL gibi sayılıyor ama
    // gelir tarafındaki "kur eksik" uyarısına girmiyordu — brüt kâr sessizce şişiyordu.
    const kurYoksa = (pb) => { if (pb && pb !== "TRY" && !(parseFloat((kurlar || {})[pb]) > 0)) kurEksik.add(pb); };
    if (p.kategori === "Mamul") {
      const d = (p.recete || []).length ? finansMamulBirimDegeri(p, h.renk, h.beden, "hammadde", stok, kurlar, [], maliyetBaglami) : null;
      if (d && d.kurYok) kurEksik.add(d.kurYok);
      if (d && d.hammadde > 0) deger = d.hammadde;
      else { deger = alisFiyatiTL(p, kurlar); if (parseFloat(p.alisFiyati) > 0) kurYoksa(alisPbKodu(p)); }
    } else {
      const bf = hammaddeBirimFiyati(p, h.renk, h.beden, kurlar, maliyetBaglami);
      if (bf.kendiFiyat > 0) kurYoksa(bf.pb);
      deger = bf.tl;
    }
    birimMaliyetOnbellek.set(anahtar, deger);
    return deger;
  };
  const cariAyagi = new Map();
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => { if (h && h.id) cariAyagi.set(h.id, h); }));
  let satisGeliri = 0;
  let smm = 0;
  let fiyatsizSatir = 0;
  const satisKalemleri = [];
  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (h.kaynak !== "Satış" || (h.miktar || 0) >= 0) return;
      if (!kzTarihUygun(h.tarih, aralik)) return;
      const adet = Math.abs(h.miktar || 0);
      const ch = cariAyagi.get(h.id);
      if (!kapsar(ch ? ch.defter : "Genel")) return;
      let gelir = 0;
      if (ch) {
        const net = typeof ch.matrah === "number" ? ch.matrah : (ch.tutar || 0);
        gelir = kzTL(net, ch.paraBirimi, kurlar, kurEksik);
      } else if (h.birimFiyat) {
        gelir = kzTL(h.birimFiyat * adet, h.paraBirimi, kurlar, kurEksik);
      } else {
        fiyatsizSatir += 1;
      }
      const maliyet = kzBirimMaliyet(p, h) * adet;
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
      if (!kzTarihUygun(h.tarih, aralik) || !kapsar(h.defter)) return;
      const kart = kartAdi[h.giderKartId] || { ad: h.giderKartAd || "Bilinmeyen", grup: h.giderGrubu || "yonetim", tur: "gider" };
      const tutar = kzTL(h.tutar || 0, hes.paraBirimi, kurlar, kurEksik);
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
      // MAAŞ DA İŞÇİLİK (v1.585.0): atölye içi bölümde parça başı tutar cariye yazılmıyor; o bölümün gerçek işçilik
      // maliyeti personele tahakkuk eden maaştır. Çift sayım yok — bölümde "-İşçilik" cari hareketi hiç doğmuyor.
      const maasMi = h.islemTipi === "Maaş" || /^MAAS-/.test(String(h.fisNo || ""));
      if (!maasMi && (!h.fisNo || !/-İşçilik$/.test(h.fisNo))) return;
      // YÖNE BAKILMIYOR (v1.409.0): işçilik v1.408'e kadar yanlışlıkla "Borç", sonra doğru
      // yönde "Alacak" yazıldı. İkisi de aynı olayı (hak edilen ücret) anlatıyor; işçilik
      // fişinin geri alınması karşı kayıtla değil SİLMEYLE yapıldığı için ters yönlü bir
      // işçilik hareketi yok. Yöne bakmak eski kayıtları ya da yenileri rapordan düşürürdü.
      if (!kzTarihUygun(h.tarih, aralik) || !kapsar(h.defter)) return;
      const tutar = kzTL(h.tutar || 0, h.paraBirimi, kurlar, kurEksik);
      uretimIscilik += tutar;
      iscilikDetay[c.unvan] = (iscilikDetay[c.unvan] || 0) + tutar;
    });
  });

  const brutKar = satisGeliri - smm - uretimIscilik;
  const netKar = brutKar - giderToplam + digerGelir;
  // ATÖLYE İÇİ BÖLÜMLER (v1.585.0): bölümün dönem tahakkuku (ürünlere yüklenen parça başı) − maaşları.
  const bolumler = ((tanimlar && tanimlar.bolumler) || []).map((b) => ({ id: b.id, ad: b.ad,
    ...bolumKarZarar(b, uretim, cariler, (t) => kzTarihUygun(t, aralik)) }));
  return {
    aralik, satisGeliri, smm, fiyatsizSatir, uretimIscilik, iscilikDetay, brutKar, giderToplam, digerGelir, netKar, bolumler,
    gruplar, satisKalemleri,
    kurEksik: [...kurEksik],
    // Gider kartı hiç yoksa kullanıcıya yol göstermek için.
    kartYok: (giderKartlari || []).length === 0,
  };
}

function KarZararPaneli({ stok, cariler, muhasebe, giderKartlari, tanimlar, uretim }) {
  const [donem, setDonem] = useState("buAy");
  const [defter, setDefter] = useState("Tümü");
  const sonuc = karZararHesapla({ stok, cariler, muhasebe, giderKartlari, donem, defter, uretim, tanimlar });
  const para = (v) => `${Math.round(v).toLocaleString("tr-TR")} ₺`;

  const satir = (etiket, deger, renk, kalin, ipucu) => (
    <div title={ipucu} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      borderBottom: "1px solid var(--erp-head)", background: kalin ? "var(--erp-panel)" : "transparent" }}>
      <span style={{ flex: 1, fontSize: kalin ? 14 : 13, fontWeight: kalin ? 700 : 500, color: "var(--erp-text)" }}>{etiket}</span>
      <span className="mono" style={{ fontSize: kalin ? 15 : 13, fontWeight: 700, color: renk || "var(--erp-text)" }}>{para(deger)}</span>
    </div>
  );

  return (
    <div data-kar-zarar="1" style={{ display: "grid", gap: 12 }}>
      {sonuc.kurEksik.length > 0 && (
        <div data-kz-kur-eksik={sonuc.kurEksik.join(",")} style={{ padding: "8px 12px", borderRadius: "var(--erp-r-md)", border: "1.5px solid var(--erp-warn)",
          background: "var(--erp-orange-bg)", color: "var(--erp-warn)", fontSize: 12, fontWeight: 600 }}>
          ⚠ {sonuc.kurEksik.join(", ")} kuru yok — bu para birimindeki tutarlar TL gibi sayıldı, rapor yanlış olabilir.
          Üst şeritteki kuru güncelleyin (↻) ya da elle girin.
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[{ k: "buAy", ad: "Bu ay" }, { k: "gecenAy", ad: "Geçen ay" }, { k: "buYil", ad: "Bu yıl" }, { k: "tumu", ad: "Tümü" }].map((d) => (
          <button key={d.k} type="button" data-kz-donem={d.k} onClick={() => setDonem(d.k)}
            style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${donem === d.k ? "var(--erp-primary)" : "var(--erp-border)"}`,
              background: donem === d.k ? "#4E6B4E1A" : "#fff", color: donem === d.k ? "var(--erp-primary)" : "var(--erp-text-2)" }}>
            {d.ad}
          </button>
        ))}
        {/* DEFTER SEÇİMİ (v1.543.0) — dönemden ayrı grup; kasa/cari ekranlarındaki Tümü/Genel/Resmi ile aynı. */}
        <span style={{ width: 1, height: 22, background: "var(--erp-line)", margin: "0 4px" }} />
        {["Tümü", "Genel", "Resmi"].map((d) => (
          <button key={d} type="button" data-kz-defter={d} onClick={() => setDefter(d)}
            style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${defter === d ? "var(--erp-primary)" : "var(--erp-border)"}`,
              background: defter === d ? "#4E6B4E1A" : "#fff", color: defter === d ? "var(--erp-primary)" : "var(--erp-text-2)" }}>
            {d}
          </button>
        ))}
      </div>

      {sonuc.fiyatsizSatir > 0 && (
        <div data-kz-fiyatsiz="1" style={{ background: "#FFF4E6", border: "1px solid #E1A03F", borderRadius: "var(--erp-r-md)", padding: "10px 12px", fontSize: 12, color: "#7A5A28" }}>
          {sonuc.fiyatsizSatir} satış satırının fiyatı bulunamadı (cari kaydı yok) — satış gelirine 0 olarak girdi.
        </div>
      )}

      {sonuc.kartYok && (
        <div style={{ background: "#FFF4E6", border: "1px solid #E1A03F", borderRadius: "var(--erp-r-md)", padding: "10px 12px", fontSize: 12, color: "#7A5A28" }}>
          Gider kartı tanımlı değil: kira, elektrik, personel gibi kalemler hesaba girmiyor.
          Finans › Gelir / Gider ekranından ekleyin.
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
        {satir("Satış geliri", sonuc.satisGeliri, "var(--erp-primary)", false, "Dönemdeki satış fişlerinin tutarı (KDV hariç)")}
        {satir("− Satılan malın maliyeti", -sonuc.smm, "var(--erp-warn)", false, "Mamulde reçete hammaddesi, diğerlerinde kendisi — son alış fiyatlarıyla (yaklaşık)")}
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
        <div data-iscilik-dokumu="1" style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "var(--erp-hover)", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
            Üretim işçiliği — kime ne kadar hak edildi
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 12px" }}>
            {Object.entries(sonuc.iscilikDetay).sort((a2, b2) => b2[1] - a2[1]).map(([ad, tutar]) => (
              <span key={ad} className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)",
                border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-pill)", padding: "2px 9px" }}>
                {ad} · {para(tutar)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GİDER DÖKÜMÜ — grup grup, altında kartlar. "Nereye gitti" sorusunun cevabı. */}
      {sonuc.giderToplam > 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "var(--erp-hover)", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
            Giderlerin dağılımı
          </div>
          {giderGelirGruplari(tanimlar).filter((g) => sonuc.gruplar[g.key]).map((g) => {
            const veri = sonuc.gruplar[g.key];
            const oran = sonuc.giderToplam > 0 ? (veri.toplam / sonuc.giderToplam) * 100 : 0;
            return (
              <div key={g.key} data-kz-grup={g.key} style={{ borderBottom: "1px solid var(--erp-head)", padding: "8px 12px" }}>
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
                      border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-pill)", padding: "2px 9px" }}>
                      {ad} · {para(tutar)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(sonuc.bolumler || []).length > 0 && (
        <div data-kz-bolumler="1" style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", borderBottom: "1px solid var(--erp-head)" }}>
            Atölye içi bölümler <span style={{ fontWeight: 400 }}>— ürünlere yüklenen parça başı tutar − maaşlar</span>
          </div>
          {sonuc.bolumler.map((b) => (
            <div key={b.id} data-kz-bolum={b.ad} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--erp-head)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 140px", fontSize: 13, fontWeight: 700 }}>{b.ad}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>tahakkuk {para(b.tahakkuk)} <span style={{ fontSize: 11 }}>({b.adet.toLocaleString("tr-TR")} adet)</span></span>
              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>maaş {para(b.maas)}</span>
              <span className="mono" data-kz-bolum-kar={b.ad} style={{ fontSize: 14, fontWeight: 700, color: b.kar >= 0 ? "var(--erp-ok)" : "var(--erp-danger)" }}>
                {b.kar >= 0 ? "kâr" : "zarar"} {para(Math.abs(b.kar))}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--erp-text-3)", lineHeight: 1.5 }}>
        Satılan malın maliyeti: mamulde <b>reçetedeki hammaddeler</b>, diğer ürünlerde kendisi — fiyat
        <b>son 3 ayın alış ortalaması</b> (o renk); son alış daha eskiyse o günün dolar kuruyla bugüne
        taşınmış hâli; alış yoksa kart fiyatı. Bugünün maliyeti — parti bazlı gerçek maliyet değil.
        İşçilik ayrı satırda. Döviz tutarları <b>bugünkü kurla</b> TL'ye çevriliyor.
      </div>
    </div>
  );
}
