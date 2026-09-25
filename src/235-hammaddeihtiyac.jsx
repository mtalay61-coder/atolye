function HammaddeIhtiyacSekmesi({ siparisler, stok, uretim, onGoToSiparis, onGoToUrun, onGoToUretim, cariler, onPlanlaHammaddeSatinAlma, sadeceUretimPlanli, aciklamaMetni, bosDurumMetni, hedefHammadde, onHedefTuketildi, showToast }) {
  const [acikHammadde, setAcikHammadde] = useState(null);
  const [sadeceEksik, setSadeceEksik] = useState(true);
  const [arama, setArama] = useState("");
  // Satın alma paneli: aynı anda TEK bir hammadde+renk satırı için açık olur. Panel açıkken girilen
  // miktarlar burada tutulur ("renk::beden" -> string) — böylece kullanıcı ihtiyaçtan farklı (örn.
  // tedarikçinin minimum sipariş adedine yuvarlanmış) bir miktar girebilir.
  // ÇOKLU SEÇİM — aynı tedarikçiden birden fazla hammaddeyi TEK alış siparişinde toplamak için.
  // Anahtar: "urunId|renk|beden". Değer, o hücrenin sipariş edilecek miktarı ve rezervasyon payları.
  // Seçim hücre bazında tutulur (renk satırı bazında değil): kullanıcı bir rengin yalnızca bazı
  // bedenlerini almak isteyebilir ve miktarlar beden başına farklıdır.
  const [topluSecim, setTopluSecim] = useState({});
  const [topluCariId, setTopluCariId] = useState("");

  // Panel BİRDEN ÇOK RENGİ kapsayabiliyor: Depo'dan gelen bir üründe birkaç rengin açığı olabilir
  // ve kullanıcı hepsini tek alış siparişinde istiyor (12 Eylül). Miktar anahtarı zaten
  // "renk::beden" olduğu için tablo yapısı değişmedi, yalnız satırlar renk renk çoğaldı.
  const [satinAlmaPanel, setSatinAlmaPanel] = useState(null); // { hammaddeUrunId, renkler: [...] } | null
  const [satinAlmaMiktarlari, setSatinAlmaMiktarlari] = useState({});
  const [satinAlmaCariId, setSatinAlmaCariId] = useState("");

  const tedarikciler = (cariler || []).filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi");

  // Ham MRP sonucu, her hücre için "bu ihtiyaç için ZATEN sipariş verilmiş mi" bilgisiyle zenginleştirilir.
  // netEksik = gerçek eksik − yoldaki (sipariş verilmiş ama henüz teslim alınmamış) miktar. Bu olmadan
  // ekran, zaten sipariş edilmiş bir hammaddeyi hâlâ "eksik" gösterir ve kullanıcı ikinci kez sipariş verirdi.
  // SERBEST ALIM SATIRLARI.
  //
  // Depo'daki "Satın Al" bir malzeme için bu ekranı açıyor. Ama MRP yalnızca bekleyen satış
  // siparişlerinden doğan ve HENÜZ PLANLANMAMIŞ ihtiyacı listeliyor; Depo ise stok/rezervasyon
  // defterinden "açık" hesaplıyor. Malzemenin Depo'da açığı olup burada karşılığı olmayabilir.
  //
  // Eskiden bu durumda pencere kapanıyordu ("bastım, hiçbir şey açılmadı"). Sonra doğrudan ALIŞ
  // FİŞİ açıldı — o da yanlıştı: kullanıcının ayrımına göre **alış fişi** siparişsiz, doğrudan
  // cariden alımdır; **satın al** ise ALIŞ SİPARİŞİ girer. İkisi aynı ekrana çıkmamalı.
  //
  // Doğrusu: malzemeyi bu ekrana MİKTARSIZ bir satır olarak eklemek. Kullanıcı miktarı kendisi
  // yazıp alış siparişini buradan oluşturuyor — ekranın işi zaten bu.
  //
  // DEPO SATIRI RENK+BEDEN OLARAK GELİYOR (kullanıcı, 12 Eylül: "satın al ile alışta yaptığımızın
  // aynısı olması gerekli, stok zaten belli renk beden vs."). Alış fişindeki kalıbın aynısı
  // (`taslak.kalemler`, 7z-49): Depo satırı bir ürünün BÜTÜN renklerini tek grupta topluyor, o
  // yüzden tek bir `renk` alanı yok. Eskiden düğme `g.renk` gönderiyordu — hep boştu; pencere
  // başlığı "Satın Al: Deri · undefined" çıkıyor, hiçbir varyant eşleşmediği için "bulunamadı"
  // deyip kapanıyordu.
  const serbestSatirlar = [];
  if (hedefHammadde && hedefHammadde.urunId) {
    const hm = (stok || []).find((p) => p.id === hedefHammadde.urunId);
    if (hm) {
      (hedefHammadde.kalemler || [])
        .filter((k) => (Number(k.miktar) || 0) > 0)
        .forEach((k) => {
          // DEPO'DAN GELEN AÇIK MİKTAR (kullanıcı, 7 Eylül: "satın al tuşu da aynı mantıkta").
          // Önce hepsi 0 geliyordu ve kullanıcı Depo'da gördüğü sayıyı buraya elle yazıyordu.
          const acik = Number(k.miktar) || 0;
          const v = (hm.variants || []).find((x) => x.renk === k.renk && x.beden === k.beden) || {};
          serbestSatirlar.push({
            hammaddeUrunId: hm.id, hammaddeAd: hm.ad, renk: k.renk, beden: k.beden,
            birim: hm.birim || "", gereken: acik, kaynaklar: [],
            mevcutStok: v.miktar || 0, minStok: v.minStok || 0,
            alisFiyati: hm.alisFiyati || 0,
            // `fark` ve `eksikMi` açık miktardan türüyor: satır ancak "eksik" ise satın alma
            // listesine giriyor. Sıfır miktarlı satırı eksik saymak, alınacak bir şey yokken
            // sipariş formu açtırırdı.
            fark: acik > 0 ? -acik : (v.miktar || 0),
            eksikMi: acik > 0,
            eksikMiktar: acik, eksikMaliyet: Math.round(acik * (hm.alisFiyati || 0) * 100) / 100,
            serbestMi: true,   // planlamadan değil, kullanıcının isteğiyle eklendi
          });
        });
    }
  }

  const mrpSonuclari = mrpHesapla(siparisler || [], stok || [], uretim || [], sadeceUretimPlanli).map((r) => {
    const kaynakIdler = new Set(r.kaynaklar.map((k) => k.siparisId));
    const satinAlma = hammaddeSatinAlmaDurumu(r.hammaddeUrunId, r.renk, r.beden, kaynakIdler, siparisler || []);
    const netEksik = Math.round(Math.max(0, r.eksikMiktar - satinAlma.yolda) * 100) / 100;
    return {
      ...r, satinAlma, netEksik,
      netEksikMaliyet: Math.round(netEksik * (r.alisFiyati || 0) * 100) / 100,
      // Eksik ama net eksiği kalmamış = tamamı sipariş edilmiş, yolda.
      siparisteMi: r.eksikMi && netEksik === 0 && satinAlma.yolda > 0,
    };
  });
  // Serbest satırlar yalnızca MRP'de KARŞILIĞI OLMAYAN renk/bedenler için eklenir; aynı hücre
  // iki kez listelenirse kullanıcı hangisine miktar yazacağını bilemez.
  serbestSatirlar.forEach((sr) => {
    const varMi = mrpSonuclari.some((r) =>
      r.hammaddeUrunId === sr.hammaddeUrunId && r.renk === sr.renk && r.beden === sr.beden);
    // `satinAlma` nesnesi GERÇEK hesaplayıcıdan alınıyor: alanlarını elle uydurmak, ekranın
    // beklediği bir alanı (ör. `acikFisler`) unutup çalışma anında hata vermeye yol açıyordu.
    if (!varMi) {
      const satinAlma = hammaddeSatinAlmaDurumu(sr.hammaddeUrunId, sr.renk, sr.beden, new Set(), siparisler || []);
      mrpSonuclari.push({ ...sr, satinAlma, netEksik: 0, netEksikMaliyet: 0, siparisteMi: false });
    }
  });

  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const eksikSayisi = mrpSonuclari.filter((r) => r.netEksik > 0).length;
  const yoldaSayisi = mrpSonuclari.filter((r) => r.satinAlma.yolda > 0).length;
  const toplamEksikMaliyet = mrpSonuclari.reduce((s, r) => s + (r.netEksikMaliyet || 0), 0);

  // Bir renk satırının eksik hücrelerini toplu listeye ekler ya da çıkarır.
  function satirSecimDegistir(g, rg, tumBedenler, ekle) {
    const yeni = { ...topluSecim };
    tumBedenler.forEach((b) => {
      const r = rg.bedenIndex[b];
      if (!r || r.netEksik <= 0) return;
      const anahtar = `${g.hammaddeUrunId}|${rg.renk}|${b}`;
      if (!ekle) { delete yeni[anahtar]; return; }
      yeni[anahtar] = {
        hammaddeUrunId: g.hammaddeUrunId,
        hammaddeAd: g.hammaddeAd,
        renk: rg.renk,
        beden: b,
        birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim || g.birim),
        miktar: r.netEksik,
        alisFiyati: r.alisFiyati || 0,
        // Rezervasyon payları seçim anında hesaplanır; kaynak siparişler sonradan değişse bile
        // kullanıcının onayladığı dağıtım korunur.
        rezervasyonlar: hammaddeRezervasyonDagit(r.kaynaklar, r.netEksik),
      };
    });
    setTopluSecim(yeni);
  }

  function topluSecimTemizle() {
    setTopluSecim({});
    setTopluCariId("");
  }

  // Panel iki yerden açılıyor: matristeki "Satın Al" butonu ve Depo'dan gelen hedef. İkinci
  // çağıranın elinde render sırasında kurulan renk grubu yok; bu yüzden başlangıç miktarları
  // renk grubundan DEĞİL, doğrudan MRP sonuçlarından okunuyor. Tek yol olması, iki açılışın
  // zamanla farklı davranmasını engelliyor.
  // Dönüş: hammadde+renk MRP'de bulunduysa true.
  function satinAlmaAc(hammaddeUrunId, renkGirdisi) {
    const renkler = [...new Set((Array.isArray(renkGirdisi) ? renkGirdisi : [renkGirdisi]).filter((x) => x != null))];
    const eslesenler = mrpSonuclari.filter((r) => r.hammaddeUrunId === hammaddeUrunId && renkler.includes(r.renk));
    if (eslesenler.length === 0) return false;
    const baslangic = {};
    eslesenler.forEach((r) => {
      // Depo'dan gelen serbest satırda `netEksik` 0; oradaki açık miktar `eksikMiktar`ta duruyor.
      // İkisinden hangisi doluysa o yazılıyor — kullanıcı Depo'da gördüğü sayıyı yeniden yazmasın.
      const on = r.netEksik > 0 ? r.netEksik : (r.serbestMi ? r.eksikMiktar : 0);
      if (on > 0) baslangic[`${r.renk}::${r.beden}`] = String(on);
    });
    setSatinAlmaMiktarlari(baslangic);
    // Hammaddenin kartında varsayılan tedarikçi tanımlıysa hazır gelir — planlama ekranında
    // tedarikçiyi her seferinde listeden bulmak, aynı hammadde hep aynı yerden alınırken
    // gereksiz bir adımdı. Kullanıcı yine değiştirebilir.
    const hm = (stok || []).find((p) => p.id === hammaddeUrunId);
    const varsayilanTed = hm && hm.tedarikciId
      ? (cariler || []).find((c) => c.id === hm.tedarikciId && !c.pasif)
      : null;
    setSatinAlmaCariId(varsayilanTed ? varsayilanTed.id : "");
    setSatinAlmaPanel({ hammaddeUrunId, renkler });
    return true;
  }
  function satinAlmaKapat() {
    setSatinAlmaPanel(null);
    setSatinAlmaMiktarlari({});
    setSatinAlmaCariId("");
  }

  // DEPO'DAN GELEN HEDEF — Depo matrisindeki "Satın Al" butonu buraya düşer. Yeni bir ekran
  // tasarlanmadı; var olan panel açılıyor, böylece satın alma akışı tek yerde kalıyor.
  useEffect(() => {
    if (!hedefHammadde) return;
    const bitir = () => { if (onHedefTuketildi) onHedefTuketildi(); };
    // Süzgeçler hedefi gizleyebilir: arama kutusu doluysa kart hiç çizilmez, panel de görünmez.
    // "Sadece eksikler" yalnızca gerektiğinde kapatılıyor — kullanıcının süzgeç tercihini
    // gereksiz yere bozmamak için.
    // Depo'da açığı olan RENKLER; hiç kalem gelmediyse (eski çağrı biçimi) ürünün tüm renkleri.
    const hedefRenkler = (hedefHammadde.kalemler || []).length > 0
      ? [...new Set(hedefHammadde.kalemler.map((k) => k.renk))]
      : [...new Set(mrpSonuclari.filter((r) => r.hammaddeUrunId === hedefHammadde.urunId).map((r) => r.renk))];
    const eslesenler = mrpSonuclari.filter(
      (r) => r.hammaddeUrunId === hedefHammadde.urunId && hedefRenkler.includes(r.renk)
    );
    if (eslesenler.length === 0) {
      // MRP yalnızca bekleyen satış siparişlerinin ihtiyacını hesaplar. Depo'da açık görünen bir
      // malzemenin burada karşılığı olmayabilir (talep başka yoldan doğmuşsa). Boş ekran
      // göstermek "buton çalışmadı" izlenimi verirdi; sebep söyleniyor.
      // Buraya artık normal şartlarda düşülmüyor: serbest satırlar eklendiği için hedef malzeme
      // her zaman listede oluyor. Yine de malzeme silinmişse bilgi verip kapatıyoruz.
      if (showToast) showToast(`${hedefHammadde.urunAd || "Bu malzeme"} bulunamadı`);
      bitir();
      return;
    }
    // Pencere tek bir malzeme için açıldıysa liste ona daraltılır (arama kutusu hedefin adıyla
    // doldurulur). Kutu görünür kalıyor: kullanıcı temizleyip tüm listeye dönebilir.
    setArama(hedefHammadde.odakla ? (hedefHammadde.urunAd || "") : "");
    if (!eslesenler.some((r) => r.eksikMi)) setSadeceEksik(false);
    satinAlmaAc(hedefHammadde.urunId, hedefRenkler);
    // Uzun listede kart ekranın dışında kalabilir; panel açılıp görünmezse buton çalışmamış sanılır.
    const kartId = `hm-kart-${hedefHammadde.urunId}`;
    setTimeout(() => {
      const el = typeof document !== "undefined" ? document.getElementById(kartId) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    bitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefHammadde]);

  if (mrpSonuclari.length === 0) {
    return <EmptyState text={bosDurumMetni || "Bekleyen satış siparişi kalemi yok — hesaplanacak bir hammadde ihtiyacı bulunamadı."} />;
  }

  // STOK KAYDI EKSİ OLAN KALEMLER — listenin başında toplu uyarı.
  //
  // Kullanıcı (7 Eylül): "Eksi stok olamaz, yoktan var olamaz. Eksi stoğu ihtiyaç için değil,
  // DEĞERLENDİRME için kullanalım."
  //
  // Tek tek hücreleri gezip ⚠ işareti aramak zorunda kalmamak için: kaç kalemin kaydı bozuk,
  // hangileri — hepsi burada. Bu bir satın alma listesi DEĞİL, bir düzeltme listesi.
  const stokBilinmeyenler = (() => {
    const m = new Map();
    (mrpSonuclari || []).forEach((r) => {
      if (!r.stokBilinmiyor) return;
      const anahtar = `${r.hammaddeUrunId}|${r.renk}|${r.beden}`;
      if (!m.has(anahtar)) m.set(anahtar, r);
    });
    return [...m.values()];
  })();

  return (
    <div>
      {stokBilinmeyenler.length > 0 && (
        <div style={{ background: "#FBF3E4", border: "1.5px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <AlertTriangle size={15} color="var(--erp-brown)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)" }}>
              {stokBilinmeyenler.length} kalemin stok kaydı eksiye düşmüş — gerçek miktar bilinmiyor
            </span>
          </div>
          {/* NEDEN SATIN ALMA ÖNERİSİ YOK: eksi değer bir miktar değil, bir kayıt hatası.
              −112 görüp 112 sipariş etmek, depoda duran malı ikinci kez almak olabilir. */}
          <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.6 }}>
            Eksi stok "şu kadar eksiğim" demek değil, kaydın bozulduğu anlamına gelir. İki sebebi
            olabilir: <b>alış girişi yapılmadan</b> malzeme kullanılmıştır, ya da <b>reçete
            tükettiğinden fazlasını düşüyordur</b>. Aşağıda her kalem için, üretim ölçümlerine
            bakılarak hangisi olduğu tahmin ediliyor.
            <br />
            Hesapta bu kalemlerin stoğu <b>0 kabul edildi</b> — ihtiyaç, elde hiç mal yokmuş gibi
            hesaplandı. Gerçek miktar <b>sayımla</b> bulunur.
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {stokBilinmeyenler.map((r) => {
              // SEBEP TAHMİNİ — kullanıcı (7 Eylül): "İKİSİ DE OLABİLİR."
              // İkisi de olabiliyorsa hangisi olduğu VERİDEN çıkarılmalı; reçete gerçekleşmesi
              // (7z-29) tam bunu ayırt ediyor. Ölçüm yoksa bir şey UYDURULMUYOR.
              const sebep = eksiStokSebebi(stok || [], r.hammaddeUrunId, r.renk, r.beden);
              return (
                <div key={`${r.hammaddeUrunId}|${r.renk}|${r.beden}`}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--erp-text)" }}>
                    <b>{r.hammaddeAd}</b>
                    <span style={{ color: "var(--erp-text-2)" }}> {r.renk}{r.beden ? ` · ${r.beden}` : ""}</span>
                    <span style={{ color: "var(--erp-warn)", fontWeight: 700, marginLeft: 8 }}>kayıt: {r.hamStok} {r.birim}</span>
                  </div>
                  {sebep.tur === "recete" && (
                    <div style={{ fontSize: 11, color: "var(--erp-brown)", marginLeft: 4, marginTop: 2, lineHeight: 1.5 }}>
                      ↳ <b>Reçete fazla düşüyor olabilir.</b>{" "}
                      {sebep.supheliler.map((x) => `${x.urunAd}: reçete ${x.planlanan} → ölçülen ${x.olculen} (${x.olcum} ölçüm)`).join(" · ")}
                      {" "}— reçeteyi düzeltmek eksinin BİRİKMESİNİ durdurur, ama biriken kısım yine sayımla kapanır.
                    </div>
                  )}
                  {sebep.tur === "giris" && (
                    <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginLeft: 4, marginTop: 2, lineHeight: 1.5 }}>
                      ↳ Ölçülen tüketim reçeteyle uyumlu — düşülen miktar doğru. Eksi büyük ihtimalle
                      <b> alış girişinin yapılmamasından</b>.
                    </div>
                  )}
                  {sebep.tur === "bilinmiyor" && (
                    <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginLeft: 4, marginTop: 2, lineHeight: 1.5 }}>
                      ↳ Bu hammadde için henüz üretim ölçümü yok; sebep söylenemez.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--erp-text-2)", maxWidth: 480 }}>
          {aciklamaMetni || (
            <>
              Bekleyen (henüz tam karşılanmamış) satış siparişlerine göre gereken hammadde, mevcut stokla karşılaştırılıyor.
              Satınalmaya planlanmış kalemler hariç tutulur (dışarıdan hazır gelecekleri için); üretime planlanıp
              zaten tamamlanmış prosesler tekrar sayılmaz.
            </>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "grid", gap: 6, justifyItems: "end" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {eksikSayisi > 0 && (
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E22", color: "var(--erp-warn)" }}>
                {eksikSayisi} hammaddede eksik var
              </span>
            )}
            {yoldaSayisi > 0 && (
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A22", color: "var(--erp-info)" }} title="Alış siparişi verilmiş, henüz teslim alınmamış">
                {yoldaSayisi} hammadde siparişte
              </span>
            )}
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: "5px 10px" }}
              onClick={() => setSadeceEksik((v) => !v)}
            >
              {sadeceEksik ? "Tümünü Göster" : "Sadece Eksikleri Göster"}
            </button>
          </div>
          {toplamEksikMaliyet > 0 && (
            <div className="mono" style={{ fontSize: 12, color: "var(--erp-warn)", fontWeight: 700 }}>
              Tahmini satın alma maliyeti (sipariş edilmemiş eksikler): {toplamEksikMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 10, maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "#A6957A" }} />
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Hammadde veya renk ara…"
          style={{ width: "100%", padding: "7px 10px 7px 28px", borderRadius: "var(--erp-r-md)", border: "1px solid #C9B99A", background: "var(--erp-panel)", fontSize: 13 }}
        />
      </div>

      {(() => {
        // ARTIK AYNI HAMMADDE (isim), farklı renklerde bile olsa, AYRI AYRI KARTLARDA tekrar etmiyor —
        // önceki sürüm "Astar · Siyah" ve "Astar · Beyaz" için İKİ AYRI kart gösteriyordu. Şimdi HER
        // HAMMADDE İÇİN TEK BİR KART var; kartın içindeki matriste satırlar = RENK, sütunlar = TÜM
        // bedenlerin (o hammaddenin tüm renklerindeki) birleşimi — sipariş girişi ve diğer matrislerle
        // birebir aynı düzen.
        const grupIndex = {};
        const gruplar = [];
        mrpSonuclari.forEach((r) => {
          const anahtar = r.hammaddeUrunId;
          if (!(anahtar in grupIndex)) {
            grupIndex[anahtar] = gruplar.length;
            gruplar.push({ anahtar, hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, birim: r.birim, sonuclar: [] });
          }
          gruplar[grupIndex[anahtar]].sonuclar.push(r);
        });

        // Arama ve "sadece eksik" filtreleri hücre (renk+beden) seviyesinde uygulanır — bir grup, EN AZ
        // BİR hücresi filtreyle eşleşiyorsa gösterilir (o zaman içinde SADECE eşleşen hücreler görünür).
        const filtreliGruplar = gruplar
          .map((g) => {
            const eslesenler = g.sonuclar.filter((r) => {
              // "Sadece eksikleri göster" filtresi, HÂLÂ sipariş edilmemiş eksikleri VE sipariş
              // edilip yolda olanları birlikte gösterir — yoldakini gizlemek, kullanıcının "eksikti,
              // nereye gitti?" diye tekrar sipariş vermesine yol açardı.
              if (sadeceEksik && !r.eksikMi) return false;
              if (q && !(g.hammaddeAd.toLocaleLowerCase("tr-TR").includes(q) || r.renk.toLocaleLowerCase("tr-TR").includes(q))) return false;
              return true;
            });
            return { ...g, sonuclar: eslesenler };
          })
          .filter((g) => g.sonuclar.length > 0);

        if (filtreliGruplar.length === 0) return <EmptyState text="Bu filtreyle eşleşen bir hammadde bulunamadı." />;

        return (
          <div style={{ display: "grid", gap: 8 }}>
            {/* TOPLU SATIN ALMA ÇUBUĞU — yalnızca seçim varken görünür ve ekranın üstüne yapışır.
                Seçim yaparken sayfada aşağı inildiğinde çubuğun kaybolması, kaç kalem seçildiğini
                ve nereden sipariş açılacağını görünmez kılardı. */}
            {Object.keys(topluSecim).length > 0 && onPlanlaHammaddeSatinAlma && (() => {
              const secilenler = Object.values(topluSecim);
              const hammaddeSayisi = new Set(secilenler.map((s) => s.hammaddeUrunId)).size;
              const tahminiTutar = Math.round(secilenler.reduce((t, s) => t + s.miktar * (s.alisFiyati || 0), 0) * 100) / 100;
              // Aynı hammadde+renk+beden zaten tek anahtar olduğu için kalem birleştirmeye gerek yok.
              return (
                <div
                  style={{
                    position: "sticky", top: 0, zIndex: 30,
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    background: "var(--erp-brown)", color: "var(--erp-panel-2)", borderRadius: "var(--erp-r-md)", padding: "10px 14px",
                    boxShadow: "none",
                  }}
                >
                  <Truck size={16} />
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                    {secilenler.length} satır · {hammaddeSayisi} hammadde
                  </span>
                  {tahminiTutar > 0 && (
                    <span className="mono" style={{ fontSize: 12, opacity: 0.85 }}>
                      ~{tahminiTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                    </span>
                  )}

                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {tedarikciler.length > 0 ? (
                      <select
                        value={topluCariId}
                        onChange={(e) => setTopluCariId(e.target.value)}
                        style={{ padding: "6px 8px", fontSize: 12, border: "none", borderRadius: "var(--erp-r-sm)", background: "#fff", color: "var(--erp-text)", minWidth: 170 }}
                      >
                        <option value="">Tedarikçi seçin…</option>
                        {tedarikciler.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11 }}>Kayıtlı tedarikçi yok</span>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!topluCariId}
                      style={{ padding: "6px 12px", fontSize: 12, background: topluCariId ? "var(--erp-primary)" : "#8C6445" }}
                      onClick={() => {
                        const talepler = secilenler.map((s) => ({
                          hammaddeUrunId: s.hammaddeUrunId,
                          hammaddeAd: s.hammaddeAd,
                          renk: s.renk,
                          beden: s.beden,
                          birim: s.birim,
                          miktar: s.miktar,
                          rezervasyonlar: s.rezervasyonlar,
                        }));
                        onPlanlaHammaddeSatinAlma(talepler, topluCariId);
                        topluSecimTemizle();
                      }}
                    >
                      <Check size={13} /> Tek Siparişte Topla
                    </button>
                    <button
                      type="button"
                      onClick={topluSecimTemizle}
                      title="Seçimi temizle"
                      style={{ border: "none", background: "rgba(255,255,255,.15)", color: "var(--erp-panel-2)", borderRadius: "var(--erp-r-sm)", padding: 6, cursor: "pointer", display: "flex" }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                </div>
              );
            })()}
            {filtreliGruplar.map((g) => {
              // Renk bazında satırlara ayır — her renk kendi satırında, bedenler sütun.
              const renkGruplari = [];
              const renkIndex = {};
              g.sonuclar.forEach((r) => {
                if (!(r.renk in renkIndex)) {
                  renkIndex[r.renk] = renkGruplari.length;
                  renkGruplari.push({ renk: r.renk, bedenIndex: {} });
                }
                renkGruplari[renkIndex[r.renk]].bedenIndex[r.beden] = r;
              });
              const tumBedenler = Array.from(new Set(g.sonuclar.map((r) => r.beden)));
              const grupEksikMi = g.sonuclar.some((r) => r.netEksik > 0);
              const grupYoldaVar = g.sonuclar.some((r) => r.satinAlma.yolda > 0);
              const grupToplamEksikMaliyet = g.sonuclar.reduce((s, r) => s + (r.netEksikMaliyet || 0), 0);

              return (
                <div key={g.anahtar} id={`hm-kart-${g.hammaddeUrunId}`} style={{ background: "#fff", border: `1px solid ${grupEksikMi ? "var(--erp-orange)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-md)", padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {/* Grup başlığındaki kutu: bu hammaddenin TÜM eksik renk/bedenlerini tek
                        hamlede seçer. Çok renkli bir hammaddede satır satır işaretlemek,
                        toplu seçimin kazandırdığı zamanı geri alırdı. */}
                    {onPlanlaHammaddeSatinAlma && grupEksikMi && (() => {
                      const eksikHucreler = g.sonuclar.filter((r) => r.netEksik > 0);
                      const hepsiSecili = eksikHucreler.length > 0 &&
                        eksikHucreler.every((r) => topluSecim[`${g.hammaddeUrunId}|${r.renk}|${r.beden}`]);
                      return (
                        <input
                          type="checkbox"
                          checked={hepsiSecili}
                          onChange={() => {
                            const yeni = { ...topluSecim };
                            eksikHucreler.forEach((r) => {
                              const anahtar = `${g.hammaddeUrunId}|${r.renk}|${r.beden}`;
                              if (hepsiSecili) { delete yeni[anahtar]; return; }
                              yeni[anahtar] = {
                                hammaddeUrunId: g.hammaddeUrunId, hammaddeAd: g.hammaddeAd,
                                renk: r.renk, beden: r.beden, birim: r.birim || g.birim,
                                miktar: r.netEksik, alisFiyati: r.alisFiyati || 0,
                                rezervasyonlar: hammaddeRezervasyonDagit(r.kaynaklar, r.netEksik),
                              };
                            });
                            setTopluSecim(yeni);
                          }}
                          title={hepsiSecili ? "Bu hammaddenin tümünü seçimden çıkar" : "Bu hammaddenin tüm eksiklerini seç"}
                          style={{ cursor: "pointer", accentColor: "var(--erp-brown)" }}
                        />
                      );
                    })()}
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{g.hammaddeAd}</span>
                    {grupYoldaVar && (
                      <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A22", color: "var(--erp-info)" }}>
                        <Truck size={10} style={{ verticalAlign: -1, marginRight: 3 }} />siparişte
                      </span>
                    )}
                    {grupToplamEksikMaliyet > 0 && (
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E22", color: "var(--erp-warn)", marginLeft: "auto" }}>
                        Toplam eksik: ~{grupToplamEksikMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                      </span>
                    )}
                    {onGoToUrun && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: "3px 8px", marginLeft: grupToplamEksikMaliyet > 0 ? 0 : "auto" }}
                        onClick={() => onGoToUrun(g.hammaddeUrunId)}
                      >
                        Stok kartına git
                      </button>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                      {/* ---- İKİ KATMANLI (GRUPLU) SÜTUN BAŞLIĞI ----
                          Üst katman sütunları anlam gruplarına ayırır: beden kolonları "STOK FARKI"
                          altında, sağdaki iki kolon ise "ÖZET" altında toplanır. Tek katmanlı başlıkta
                          "36 · 37 · 38 · Toplam · Satın Alma" yan yana durunca hangi sayının neyi
                          ölçtüğü ancak tooltip açılarak anlaşılıyordu. */}
                      <thead>
                        <tr>
                          <th style={{ position: "sticky", left: 0, background: "#fff", zIndex: 2 }}></th>
                          <th
                            colSpan={tumBedenler.length}
                            style={{ fontSize: 9, letterSpacing: 0.6, textAlign: "center", padding: "2px 8px 3px", color: "var(--erp-text-2)", fontWeight: 700, borderBottom: "1px solid #E4D8C0" }}
                          >
                            STOK FARKI (mevcut − gereken)
                          </th>
                          <th
                            colSpan={onPlanlaHammaddeSatinAlma ? 2 : 1}
                            style={{ fontSize: 9, letterSpacing: 0.6, textAlign: "center", padding: "2px 8px 3px", color: "var(--erp-text-2)", fontWeight: 700, borderLeft: "1px dashed #C9B99A", borderBottom: "1px solid #E4D8C0" }}
                          >
                            ÖZET
                          </th>
                        </tr>
                        <tr>
                          <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)", position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>Renk</th>
                          {tumBedenler.map((b) => (
                            <th key={b} style={{ fontSize: 11, textAlign: "center", padding: "3px 8px", whiteSpace: "nowrap", fontWeight: 700 }}>{b}</th>
                          ))}
                          <th style={{ fontSize: 11, textAlign: "center", padding: "3px 8px", whiteSpace: "nowrap", fontWeight: 700, borderLeft: "1px dashed #C9B99A" }}>Toplam</th>
                          {onPlanlaHammaddeSatinAlma && (
                            <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", whiteSpace: "nowrap", color: "var(--erp-text-2)" }}>Satın Alma</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {renkGruplari.map((rg) => {
                          const satirToplamFark = Math.round(
                            tumBedenler.reduce((s, b) => s + (rg.bedenIndex[b] ? rg.bedenIndex[b].fark : 0), 0) * 100
                          ) / 100;
                          // Satır (renk) seviyesinde satın alma durumu: bu renkteki TÜM bedenlerin net
                          // eksiği ve yoldaki miktarı toplanır; ilgili açık alış fişleri tekilleştirilir.
                          const satirNetEksik = Math.round(
                            tumBedenler.reduce((s, b) => s + (rg.bedenIndex[b] ? rg.bedenIndex[b].netEksik : 0), 0) * 100
                          ) / 100;
                          const satirYolda = Math.round(
                            tumBedenler.reduce((s, b) => s + (rg.bedenIndex[b] ? rg.bedenIndex[b].satinAlma.yolda : 0), 0) * 100
                          ) / 100;
                          const satirFisIndex = {};
                          tumBedenler.forEach((b) => {
                            const r = rg.bedenIndex[b];
                            if (!r) return;
                            r.satinAlma.acikFisler.forEach((f) => {
                              if (!satirFisIndex[f.alisSiparisId]) satirFisIndex[f.alisSiparisId] = { ...f, payYolda: 0 };
                              satirFisIndex[f.alisSiparisId].payYolda = Math.round((satirFisIndex[f.alisSiparisId].payYolda + f.payYolda) * 100) / 100;
                            });
                          });
                          const satirAcikFisler = Object.values(satirFisIndex);
                          const panelAcikMi = !!(satinAlmaPanel && satinAlmaPanel.hammaddeUrunId === g.hammaddeUrunId && satinAlmaPanel.renkler.includes(rg.renk));
                          // Bu renk satırının eksik hücrelerinin TAMAMI toplu listede mi?
                          const satirEksikHucreler = tumBedenler
                            .map((b) => rg.bedenIndex[b])
                            .filter((r) => r && r.netEksik > 0);
                          const satirTamSecili = satirEksikHucreler.length > 0 &&
                            satirEksikHucreler.every((r) => topluSecim[`${g.hammaddeUrunId}|${rg.renk}|${r.beden}`]);
                          return (
                            <tr key={rg.renk} style={{ borderTop: "1px solid #E4D8C0" }}>
                              <td style={{ fontSize: 11, fontWeight: 600, padding: "5px 8px", whiteSpace: "nowrap", position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>{rg.renk}</td>
                              {tumBedenler.map((b) => {
                                const r = rg.bedenIndex[b];
                                if (!r) return <td key={b}></td>;
                                const anahtar = `${g.anahtar}::${rg.renk}::${b}`;
                                const acikMi = acikHammadde === anahtar;
                                // Üç durum: yeterli (yeşil) / eksik ve sipariş edilmemiş (turuncu) /
                                // eksik ama tamamı sipariş edilmiş, yolda (mavi).
                                const durumRenk = !r.eksikMi ? "var(--erp-primary)" : (r.netEksik > 0 ? "var(--erp-warn)" : "var(--erp-info)");
                                return (
                                  <td key={b} style={{ padding: "3px 6px", textAlign: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => setAcikHammadde(acikMi ? null : anahtar)}
                                      className="mono"
                                      style={{
                                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", border: acikMi ? "1.5px solid" : "1px solid",
                                        borderColor: durumRenk,
                                        background: alfaEkle(durumRenk, "22"), color: durumRenk,
                                        cursor: "pointer", whiteSpace: "nowrap",
                                      }}
                                      title={
                                        `Gereken: ${r.gereken} · Stok: ${r.mevcutStok}` +
                                        // STOK BİLİNMİYOR: kayıt eksiye düşmüş. Sayı SIFIR
                                        // sayılarak hesaplandı; gerçek miktar sayımla bulunmalı.
                                        (r.stokBilinmiyor
                                          ? ` · ⚠ STOK KAYDI EKSİ (${r.hamStok}) — gerçek miktar BİLİNMİYOR. Hesapta 0 kabul edildi; önce sayım yapıp giriş fişini kesin.`
                                          : "") +
                                        (r.eksiStoktan ? " · Bu satır siparişten değil, stok kaydının eksiye düşmesinden geliyor" : "") +
                                        (r.satinAlma.yolda > 0 ? ` · Yolda (sipariş edilmiş): ${r.satinAlma.yolda}` : "") +
                                        (r.satinAlma.teslimAlinan > 0 ? ` · Teslim alınmış: ${r.satinAlma.teslimAlinan}` : "") +
                                        (r.netEksik > 0 ? ` · Hâlâ sipariş edilmemiş eksik: ${r.netEksik}` : "")
                                      }
                                    >
                                      {r.eksikMi ? `−${Math.abs(r.fark)}` : `+${r.fark}`}
                                      {/* SAYIM İŞARETİ — rakamın güvenilmez olduğu ekranda
                                          görünmeli, yalnız ipucunda değil. Sayı veriliyor ki iş
                                          tıkanmasın; bu işaret onun neye dayandığını söylüyor. */}
                                      {r.stokBilinmiyor && <span title="Stok kaydı eksi — sayım gerekli" style={{ marginLeft: 3 }}>⚠</span>}
                                      {r.satinAlma.yolda > 0 && <Truck size={9} style={{ verticalAlign: -1, marginLeft: 3 }} />}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="mono" style={{ padding: "3px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, borderLeft: "1px dashed #C9B99A", color: satirToplamFark < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                {satirToplamFark < 0 ? `−${Math.abs(satirToplamFark)}` : `+${satirToplamFark}`}
                              </td>
                              {onPlanlaHammaddeSatinAlma && (
                                <td style={{ padding: "3px 8px", borderLeft: "1px dashed #C9B99A", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                                    {satirAcikFisler.map((f) => (
                                      <button
                                        key={f.alisSiparisId}
                                        type="button"
                                        onClick={() => onGoToSiparis && onGoToSiparis(f.alisSiparisId)}
                                        className="mono"
                                        title={`${f.alisSiparisNo} · ${f.durum} — bu renk için yolda: ${f.payYolda}. Alış siparişine gitmek için tıklayın.`}
                                        style={{
                                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)",
                                          border: `1px solid ${f.durum === "Kısmi Teslim" ? "#C9A063" : "#7FA3BE"}`,
                                          background: f.durum === "Kısmi Teslim" ? "#C97B3D1A" : "#3D6B8A1A",
                                          color: f.durum === "Kısmi Teslim" ? "var(--erp-warn)" : "var(--erp-info)",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <Truck size={9} style={{ verticalAlign: -1, marginRight: 2 }} />
                                        {f.alisSiparisNo} · {f.payYolda}
                                        {f.durum === "Kısmi Teslim" ? " (kısmi)" : ""}
                                      </button>
                                    ))}
                                    {/* Çoklu seçim kutusu: bu renk satırındaki eksik bedenleri toplu
                                        listeye ekler/çıkarır. Aynı tedarikçiden birden fazla hammadde
                                        alınacağında her satır için ayrı sipariş açmak yerine hepsi tek
                                        siparişte toplanır. */}
                                    {satirNetEksik > 0 && (
                                      <input
                                        type="checkbox"
                                        checked={satirTamSecili}
                                        onChange={() => satirSecimDegistir(g, rg, tumBedenler, !satirTamSecili)}
                                        title={satirTamSecili ? "Toplu listeden çıkar" : "Toplu satın alma listesine ekle"}
                                        style={{ cursor: "pointer", accentColor: "var(--erp-brown)" }}
                                      />
                                    )}
                                    {satirNetEksik > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => (panelAcikMi ? satinAlmaKapat() : satinAlmaAc(g.hammaddeUrunId, [rg.renk]))}
                                        className="mono"
                                        title={`${rg.renk} için sipariş edilmemiş eksik: ${satirNetEksik} ${g.birim || ""}`}
                                        style={{
                                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--erp-r-md)",
                                          border: `1px solid ${panelAcikMi ? "var(--erp-brown)" : "#C9A063"}`,
                                          background: panelAcikMi ? "var(--erp-brown)" : "#E1611F1A",
                                          color: panelAcikMi ? "#fff" : "var(--erp-brown)", cursor: "pointer",
                                        }}
                                      >
                                        {panelAcikMi ? "Kapat" : `Satın Al · ${satirNetEksik}`}
                                      </button>
                                    ) : satirYolda > 0 ? null : (
                                      <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>—</span>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* ---- DİPNOT TOPLAM SATIRI ----
                          Bir hammaddenin birden çok rengi varsa, beden bazlı toplam farkı görmek için
                          satırları gözle toplamak gerekiyordu. Sütun toplamları burada, sabit olarak
                          durur; yanındaki iki hücre de tüm renkler için net eksik ve yolda miktarını
                          verir — yani "bu hammaddeden ne kadar almam gerekiyor" tek bakışta okunur. */}
                      {renkGruplari.length > 1 && (() => {
                        const sutunToplam = (b) =>
                          Math.round(renkGruplari.reduce((s, rgx) => s + (rgx.bedenIndex[b] ? rgx.bedenIndex[b].fark : 0), 0) * 100) / 100;
                        const genelFark = Math.round(tumBedenler.reduce((s, b) => s + sutunToplam(b), 0) * 100) / 100;
                        const genelNetEksik = Math.round(g.sonuclar.reduce((s, r) => s + r.netEksik, 0) * 100) / 100;
                        const genelYolda = Math.round(g.sonuclar.reduce((s, r) => s + r.satinAlma.yolda, 0) * 100) / 100;
                        return (
                          <tfoot>
                            <tr style={{ borderTop: "2px solid #C9B99A", background: "var(--erp-panel)" }}>
                              <td style={{ fontSize: 10, fontWeight: 700, padding: "5px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--erp-panel)", zIndex: 1 }}>
                                TÜM RENKLER
                              </td>
                              {tumBedenler.map((b) => {
                                const t = sutunToplam(b);
                                return (
                                  <td key={b} className="mono" style={{ fontSize: 11, fontWeight: 700, textAlign: "center", padding: "5px 8px", color: t < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                    {t < 0 ? `−${Math.abs(t)}` : `+${t}`}
                                  </td>
                                );
                              })}
                              <td className="mono" style={{ fontSize: 11, fontWeight: 700, textAlign: "center", padding: "5px 8px", borderLeft: "1px dashed #C9B99A", color: genelFark < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                {genelFark < 0 ? `−${Math.abs(genelFark)}` : `+${genelFark}`}
                              </td>
                              {onPlanlaHammaddeSatinAlma && (
                                <td className="mono" style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", whiteSpace: "nowrap" }}>
                                  {genelNetEksik > 0 && <span style={{ color: "var(--erp-warn)", fontWeight: 700 }}>al: {genelNetEksik}</span>}
                                  {genelNetEksik > 0 && genelYolda > 0 && <span style={{ color: "var(--erp-border)" }}> · </span>}
                                  {genelYolda > 0 && <span style={{ color: "var(--erp-info)", fontWeight: 700 }}>yolda: {genelYolda}</span>}
                                  {genelNetEksik === 0 && genelYolda === 0 && <span style={{ color: "var(--erp-border)" }}>—</span>}
                                </td>
                              )}
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>

                  {/* ---- HAMMADDE SATIN ALMA PANELİ ----
                      Matristeki "Satın Al" butonuna basıldığında, o hammadde+renk için açılır. Her beden
                      ayrı bir satırdır; varsayılan miktar NET eksiktir (yoldakiler düşülmüş). Kullanıcı
                      miktarı değiştirebilir — girilen miktar, o hücreyi talep eden satış siparişlerine
                      TÜKETİM ORANINDA otomatik dağıtılır ve rezervasyon olarak alış kalemine yazılır. */}
                  {onPlanlaHammaddeSatinAlma && satinAlmaPanel && satinAlmaPanel.hammaddeUrunId === g.hammaddeUrunId && (() => {
                    // Panel birden çok rengi kapsayabiliyor (12 Eylül). Satırlar renk × beden.
                    const seciliRenkler = renkGruplari.filter((x) => satinAlmaPanel.renkler.includes(x.renk));
                    if (seciliRenkler.length === 0) return null;
                    const cokRenk = seciliRenkler.length > 1;
                    const satirlar = seciliRenkler.flatMap((rg) => tumBedenler
                      .map((b) => rg.bedenIndex[b])
                      .filter(Boolean)
                      .map((r) => {
                        const anahtar = `${rg.renk}::${r.beden}`;
                        const miktar = Math.round((parseFloat(satinAlmaMiktarlari[anahtar]) || 0) * 100) / 100;
                        return { r, renk: rg.renk, anahtar, miktar, rezervasyonlar: hammaddeRezervasyonDagit(r.kaynaklar, miktar) };
                      }));
                    const secilenler = satirlar.filter((x) => x.miktar > 0);
                    const toplamMiktar = Math.round(secilenler.reduce((s, x) => s + x.miktar, 0) * 100) / 100;
                    const tahminiTutar = Math.round(secilenler.reduce((s, x) => s + x.miktar * (x.r.alisFiyati || 0), 0) * 100) / 100;

                    // Rezervasyon özeti: seçilen TÜM bedenlerin payları, satış siparişi bazında birleştirilir.
                    const rezOzetIndex = {};
                    secilenler.forEach((x) =>
                      x.rezervasyonlar.forEach((rz) => {
                        if (!rezOzetIndex[rz.siparisId]) rezOzetIndex[rz.siparisId] = { siparisId: rz.siparisId, siparisNo: rz.siparisNo, miktar: 0 };
                        rezOzetIndex[rz.siparisId].miktar = Math.round((rezOzetIndex[rz.siparisId].miktar + rz.miktar) * 100) / 100;
                      })
                    );
                    const rezOzeti = Object.values(rezOzetIndex).sort((a, b) => b.miktar - a.miktar);

                    return (
                      <div style={{ marginTop: 10, borderTop: "2px solid #E1611F", paddingTop: 10, background: "var(--erp-panel)", margin: "10px -10px -10px", padding: "10px 10px 12px", borderRadius: "0 0 8px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <Truck size={14} color="var(--erp-brown)" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>
                            Hammadde Satın Alma — {g.hammaddeAd} · {cokRenk ? `${seciliRenkler.length} renk` : seciliRenkler[0].renk}
                          </span>
                          <button type="button" className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px", marginLeft: "auto" }} onClick={satinAlmaKapat}>
                            <X size={11} /> Kapat
                          </button>
                        </div>

                        <div style={{ overflowX: "auto", marginBottom: 8 }}>
                          <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                {cokRenk && <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)" }}>Renk</th>}
                                <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)" }}>Beden</th>
                                <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text-2)" }}>Gereken</th>
                                <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text-2)" }}>Stok</th>
                                <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text-2)" }}>Yolda</th>
                                <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-warn)", fontWeight: 700 }}>Net Eksik</th>
                                <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text)", fontWeight: 700 }}>Sipariş Edilecek</th>
                                <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)" }}>Rezervasyon (satış siparişi payları)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {satirlar.map((x) => (
                                <tr key={x.anahtar} style={{ borderTop: "1px solid #E4D8C0" }}>
                                  {cokRenk && <td style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", whiteSpace: "nowrap" }}>{x.renk}</td>}
                                  <td style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", whiteSpace: "nowrap" }}>{x.r.beden}</td>
                                  <td className="mono" style={{ fontSize: 11, textAlign: "center", padding: "4px 8px" }}>{x.r.gereken}</td>
                                  <td className="mono" style={{ fontSize: 11, textAlign: "center", padding: "4px 8px" }}>{x.r.mevcutStok}</td>
                                  <td className="mono" style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", color: x.r.satinAlma.yolda > 0 ? "var(--erp-info)" : "var(--erp-border)" }}>
                                    {x.r.satinAlma.yolda > 0 ? x.r.satinAlma.yolda : "—"}
                                  </td>
                                  <td className="mono" style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", fontWeight: 700, color: x.r.netEksik > 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                    {x.r.netEksik > 0 ? x.r.netEksik : "—"}
                                  </td>
                                  <td style={{ padding: "3px 8px", textAlign: "center" }}>
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={satinAlmaMiktarlari[x.anahtar] ?? ""}
                                      onChange={(e) => setSatinAlmaMiktarlari({ ...satinAlmaMiktarlari, [x.anahtar]: e.target.value })}
                                      className="mono"
                                      placeholder="0"
                                      style={{ width: 72, padding: "4px 5px", textAlign: "center", fontSize: 12, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff" }}
                                    />
                                  </td>
                                  <td style={{ padding: "4px 8px" }}>
                                    {x.rezervasyonlar.length === 0 ? (
                                      <span style={{ fontSize: 10, color: "var(--erp-border)" }}>—</span>
                                    ) : (
                                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        {x.rezervasyonlar.map((rz) => (
                                          <span key={rz.siparisId} className="mono" style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", background: "#9C3D3D1A", color: "#9C3D3D", border: "1px solid #C99A9A" }}>
                                            {rz.siparisNo}: {rz.miktar}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {rezOzeti.length > 0 && (
                          <div style={{ fontSize: 10, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.6 }}>
                            <b>Bu alış şu satış siparişlerine rezerve edilecek:</b>{" "}
                            {rezOzeti.map((rz, i) => (
                              <span key={rz.siparisId}>
                                <button
                                  type="button"
                                  onClick={() => onGoToSiparis && onGoToSiparis(rz.siparisId)}
                                  className="mono"
                                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--erp-info)", fontWeight: 700, fontSize: 10 }}
                                >
                                  {rz.siparisNo}
                                </button>
                                <span className="mono"> ({rz.miktar} {g.birim})</span>
                                {i < rezOzeti.length - 1 ? " · " : ""}
                              </span>
                            ))}
                            {rezOzeti.length > 1 && (
                              <div style={{ marginTop: 3, color: "var(--erp-text-3)" }}>
                                Paylar, her siparişin bu hammaddeyi tüketim oranına göre dağıtıldı. Teslim alındığında
                                hammadde ortak stoğa girer; rezervasyon kaydı "bu alış hangi siparişler için yapıldı"
                                sorusunu izlenebilir tutar.
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {tedarikciler.length > 0 ? (
                            <>
                              <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>Tedarikçi:</span>
                              <select
                                value={satinAlmaCariId}
                                onChange={(e) => setSatinAlmaCariId(e.target.value)}
                                style={{ padding: "5px 7px", fontSize: 12, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff", minWidth: 170 }}
                              >
                                <option value="">Tedarikçi seçin…</option>
                                {tedarikciler.filter((c) => !c.pasif).map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                              </select>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--erp-warn)" }}>Kayıtlı tedarikçi yok — önce Cari ekranından ekleyin.</span>
                          )}

                          {toplamMiktar > 0 && (
                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text)", fontWeight: 700 }}>
                              Toplam: {toplamMiktar} {g.birim}
                              {tahminiTutar > 0 && ` · ~${tahminiTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`}
                            </span>
                          )}

                          <button
                            className="btn-primary"
                            style={{ padding: "6px 12px", fontSize: 11, marginLeft: "auto" }}
                            disabled={toplamMiktar <= 0 || !satinAlmaCariId}
                            onClick={() => {
                              const talepler = secilenler.map((x) => ({
                                hammaddeUrunId: g.hammaddeUrunId,
                                hammaddeAd: g.hammaddeAd,
                                renk: x.renk,
                                beden: x.r.beden,
                                birim: x.r.birim || g.birim,
                                miktar: x.miktar,
                                rezervasyonlar: x.rezervasyonlar,
                              }));
                              if (talepler.length === 0) return;
                              onPlanlaHammaddeSatinAlma(talepler, satinAlmaCariId);
                              satinAlmaKapat();
                            }}
                          >
                            <Truck size={12} /> Alış Siparişi Oluştur
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {renkGruplari.map((rg) =>
                    Object.keys(rg.bedenIndex).map((b) => {
                      const anahtar = `${g.anahtar}::${rg.renk}::${b}`;
                      if (acikHammadde !== anahtar) return null;
                      const r = rg.bedenIndex[b];
                      return (
                        <div key={anahtar} style={{ marginTop: 10, borderTop: "1px dashed #E4D8C0", paddingTop: 8 }}>
                          <div style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                            {rg.renk} · Beden {b} — Gereken: {r.gereken} {r.birim} · Stok: {r.mevcutStok} {r.birim} — bu ihtiyaca katkı sağlayan sipariş kalemleri:
                          </div>
                          {(() => {
                            // Aynı hammadde renk+bedeni, FARKLI mamul renk/bedenlerinden (örn. Kırmızı 36,
                            // Kırmızı 37, Siyah 36...) talep alabilir — matris formatında (satır = sipariş+
                            // ürün+renk, sütun = mamul bedeni) gösterilir.
                            const satirGruplari = [];
                            const satirIndex = {};
                            r.kaynaklar.forEach((k) => {
                              const sanahtar = `${k.siparisId}__${k.urunAd}__${k.kalemRenk}`;
                              if (!(sanahtar in satirIndex)) {
                                satirIndex[sanahtar] = satirGruplari.length;
                                satirGruplari.push({ anahtar: sanahtar, siparisId: k.siparisId, siparisNo: k.siparisNo, urunAd: k.urunAd, renk: k.kalemRenk, bedenler: {}, uretimSiparisNo: k.uretimSiparisNo });
                              }
                              satirGruplari[satirIndex[sanahtar]].bedenler[k.kalemBeden] = k.adet;
                            });
                            const tumMamulBedenler = Array.from(new Set(r.kaynaklar.map((k) => k.kalemBeden)));
                            return (
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr>
                                      <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)", position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>Sipariş / Ürün / Renk</th>
                                      {tumMamulBedenler.map((mb) => (
                                        <th key={mb} style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{mb}</th>
                                      ))}
                                      <th style={{ fontSize: 10, textAlign: "center", padding: "3px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap", fontWeight: 700, borderLeft: "1px dashed #C9B99A" }}>Toplam</th>
                                      {onGoToUretim && <th style={{ fontSize: 10, padding: "3px 8px" }}></th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {satirGruplari.map((sg) => {
                                      const satirToplami = Math.round(tumMamulBedenler.reduce((s, mb) => s + (sg.bedenler[mb] || 0), 0) * 100) / 100;
                                      return (
                                        <tr key={sg.anahtar} style={{ borderTop: "1px solid #E4D8C0" }}>
                                          <td style={{ padding: "5px 8px", position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                                            <button
                                              type="button"
                                              onClick={() => onGoToSiparis && onGoToSiparis(sg.siparisId)}
                                              className="mono"
                                              style={{
                                                display: "flex", alignItems: "center", gap: 6, fontSize: 11, textAlign: "left",
                                                background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--erp-info)", whiteSpace: "nowrap",
                                              }}
                                            >
                                              <ArrowRight size={11} />
                                              <span style={{ fontWeight: 700 }}>{sg.siparisNo}</span>
                                              <span style={{ color: "var(--erp-text)" }}>{sg.urunAd} · {sg.renk}</span>
                                            </button>
                                          </td>
                                          {tumMamulBedenler.map((mb) => (
                                            <td key={mb} className="mono" style={{ padding: "5px 8px", textAlign: "center", fontSize: 11, color: sg.bedenler[mb] != null ? "var(--erp-text)" : "var(--erp-border)" }}>
                                              {sg.bedenler[mb] != null ? sg.bedenler[mb] : "—"}
                                            </td>
                                          ))}
                                          <td className="mono" style={{ padding: "5px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, borderLeft: "1px dashed #C9B99A" }}>
                                            {satirToplami}
                                          </td>
                                          {onGoToUretim && (
                                            <td style={{ padding: "5px 8px" }}>
                                              {sg.uretimSiparisNo && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const bagliUretim = (uretim || []).find((o) => o.siparisNo === sg.uretimSiparisNo);
                                                    if (bagliUretim) onGoToUretim(bagliUretim.id);
                                                  }}
                                                  className="mono"
                                                  title="İlgili üretim siparişine git"
                                                  style={{
                                                    fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: "var(--erp-r-md)",
                                                    background: "#4E6B4E22", border: "1px solid #8FA888", color: "var(--erp-primary)", cursor: "pointer", whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  Üretim: {sg.uretimSiparisNo}
                                                </button>
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

