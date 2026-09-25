// Bu siparişe bağlı stok girişleri (üretim + satın alma), tarih sırasıyla. Bağ: girişin
// `rezervasyonSiparisId`si bu sipariş, ya da `siparisNo`su kalemlerden birinin planlama referansı
// (üretim no / alış no). Kalem olmayan ürün/renk/beden girişi sayılmıyor — aynı üretim başka kalem
// de üretmiş olabilir. Hem kaynak izinde (FIFO pay) hem "Tedarik Girişleri" bölümünde kullanılıyor.
function siparisTedarikGirisleri(siparis, stok) {
  const planReferanslari = new Set((siparis.kalemler || [])
    .map((k) => k.planlama && k.planlama.referansNo).filter(Boolean));
  const liste = [];
  (stok || []).forEach((u) => (u.hareketler || []).forEach((sh) => {
    if (!(sh.miktar > 0)) return;
    if (!(sh.kaynak === "Üretim" || sh.kaynak === "Satınalma")) return;
    const bagli = sh.rezervasyonSiparisId === siparis.id || (sh.siparisNo && planReferanslari.has(sh.siparisNo));
    if (!bagli) return;
    const kalemVar = (siparis.kalemler || []).some((k) => k.urunAd === u.ad && (k.renk || "") === (sh.renk || "") && (k.beden || "") === (sh.beden || ""));
    if (!kalemVar) return;
    liste.push({ urunAd: u.ad, renk: sh.renk || "", beden: sh.beden || "", miktar: sh.miktar, birim: sh.birim || u.birim || "",
      kaynak: sh.kaynak, fisNo: sh.fisNo || "", siparisNo: sh.siparisNo || "", uretimId: sh.uretimId || null, tarih: sh.tarih || "",
      kalan: sh.miktar, id: sh.id });
  }));
  liste.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
  return liste;
}

// KAYNAK NOTU TIKLANABİLİR (kullanıcı, 15 Eylül: "alış siparişinde nereden geldiği kaynak
// tıklanabilir olsun, tıklayınca o siparişi açsın, kapatınca geri gelsin").
//
// Not metni "Kaynak: SAT-1001" (bir satış siparişinden türetilen alış siparişi) ya da "Hammadde
// ihtiyacı — Kaynak: SAT-1001, SAT-1003" biçiminde. Numaralar ayrıştırılıp bağlantıya çevriliyor;
// gerisi düz metin kalıyor. Kapatınca geri dönüş SEKME sisteminden geliyor: bu kartın sekmesi
// çubukta duruyor, kaynak sipariş ayrı sekmede açılıyor.
function NotKaynakla({ not, tumSiparisler, onSiparisGit }) {
  if (!not) return null;
  const parcalar = [];
  const kalip = /([A-ZÇĞİÖŞÜ]{2,4}-\d+)/g;
  let son = 0, m;
  while ((m = kalip.exec(not))) {
    if (m.index > son) parcalar.push({ metin: not.slice(son, m.index) });
    const bulunan = (tumSiparisler || []).find((x) => x.siparisNo === m[1]);
    parcalar.push({ metin: m[1], siparis: bulunan });
    son = m.index + m[1].length;
  }
  if (son < not.length) parcalar.push({ metin: not.slice(son) });
  return (
    <span>
      {parcalar.map((p, i) => (p.siparis ? (
        <button key={i} type="button" data-kaynak-siparis={p.metin}
          onClick={(e) => { e.stopPropagation(); onSiparisGit && onSiparisGit(p.siparis.id); }}
          title={`${p.metin} siparişini aç`}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit",
            color: "var(--erp-info)", fontWeight: 700, textDecoration: "underline dotted" }}>
          {p.metin}
        </button>
      ) : <span key={i}>{p.metin}</span>))}
    </span>
  );
}

// Mobil düzende gizlenmiş bölüm mü? (Tanımlar > Mobil Görünüm; masaüstünde hep açık.)
function mobilBolumGizliMi(ayar, bolumKey) {
  if (!ayar || typeof document === "undefined") return false;
  if (!document.body.classList.contains("mobil-duzen")) return false;
  return (ayar.gizli || new Set()).has(bolumKey);
}

function SiparisCard({ mobilBolumAyari, showToast, siparis, cariler, stok, stokRezervasyonlari, tumSiparisler, uretimSiparisleri, onSil, onFiseGitNo, onGerceklestir, onPlanlaUretim, onPlanlaSatinAlma, baslangicAcik, saltOkunur, onGoruldu, onSiparisGit, onGoToUretim, onPlanlamaTemizle, asortiler, onAsortiOlustur, firmaBilgileri, onPencereAc, onDuzenle, kurlar, onKayitParaGuncelle, onKalemleriBirlestir, koliler, onSatisFisiAc }) {
  const [open, setOpen] = useState(!!baslangicAcik);
  const [tedarikAcik, setTedarikAcik] = useState(true);
  const [showTeslim, setShowTeslim] = useState(false);
  const [teslimMiktarlar, setTeslimMiktarlar] = useState({});
  // ÇIKIŞ FORMU — ÜSTTE SEÇ, ALTA SATIR EKLE.
  //
  // Eskiden bekleyen her renk/beden için ekranda bir kutu vardı: 20 renk/bedenli bir modelde
  // yirmi kutu, hepsi boş, çoğuna hiç dokunulmayacak. Ekran doluyor ama iş görünmüyordu; hangi
  // satırların gerçekten çıkılacağı ancak tek tek okunarak anlaşılıyordu.
  //
  // Yeni akış sipariş girme ekranıyla aynı: üstten model/renk/beden (ya da asorti × set) seçilir,
  // "Kalem Ekle" denince satır ALTA düşer. Ekranda yalnızca gerçekten çıkılacak satırlar durur.
  const [cikisUrunId, setCikisUrunId] = useState("");
  const [cikisRenk, setCikisRenk] = useState("");
  // KALEM = MODEL + RENK, bedenler satırın içinde. Sipariş girme ekranındaki mantığın aynısı:
  // beden beden eklemek yerine bir renk eklenir, o rengin BÜTÜN bedenleri satırda listelenir ve
  // siparişteki kalan miktarlarla DOLU gelir. Kullanıcı ister tek tek düzeltir, ister asorti uygular.
  const [eklenenGruplar, setEklenenGruplar] = useState([]); // ["urunId|renk", ...]
  // SİPARİŞTEN SEÇ (9b, 13 Eylül): aynı carinin DİĞER açık alış siparişlerinden bu fişe alınan
  // kalemler. Kalem nesneleri kendi kimliğiyle (kalem id'leri tekil) bekleyenlere katılır;
  // `ekKalemSiparisi` kalem id → sipariş id. Miktar kutuları ve onay özeti aynı yolu kullanır;
  // kayıtta teslim satırı `siparisId` taşır → `siparisGerceklestir` her siparişin karşılananını
  // kendi kaydında günceller (fiş numarası ana siparişin).
  const [ekKalemler, setEkKalemler] = useState([]);          // diğer siparişlerin kalemleri
  const [ekKalemSiparisi, setEkKalemSiparisi] = useState({}); // { kalemId: siparisId }
  const [siparistenSecAcik, setSiparistenSecAcik] = useState(false);
  const tumTeslimKalemleri = [...siparis.kalemler, ...ekKalemler];
  // Fiş satırı: miktar + (değiştirildiyse) fiyat/para birimi. Fiyat kutuları ÜRÜN+RENK grubunda
  // ortak (aynı model/renk için tek fiyat konuşulur); anahtar `urunId|renk`.
  const [teslimFiyatlar, setTeslimFiyatlar] = useState({});   // { "urunId|renk": "658" }
  const [teslimPBler, setTeslimPBler] = useState({});         // { "urunId|renk": "TRY" }
  const fiyatAnahtari = (k) => `${k.urunId}|${k.renk || ""}`;
  const teslimSatiri = (k) => {
    const a = fiyatAnahtari(k);
    return {
      kalemId: k.id, miktar: parseFloat(teslimMiktarlar[k.id]) || 0,
      ...(teslimFiyatlar[a] !== undefined && teslimFiyatlar[a] !== "" ? { birimFiyat: parseFloat(teslimFiyatlar[a]) || 0 } : {}),
      ...(teslimPBler[a] ? { paraBirimi: teslimPBler[a] } : {}),
      ...(ekKalemSiparisi[k.id] ? { siparisId: ekKalemSiparisi[k.id] } : {}),
    };
  };
  // SEVKİYATTA OKUTULAN KOLİLER. Koli barkodu okutulunca içindekiler miktar kutularına dağılıyor
  // ve koli burada tutuluyor; kaydedince "Sevk edildi"ye geçmesi için çağırana veriliyor.
  const [okutulanKoliler, setOkutulanKoliler] = useState([]);
  const [barkodGirisi, setBarkodGirisi] = useState("");
  // Koli okutmanın geri bildirimi kartın İÇİNDE duruyor: kart bir pencerede açılıyor ve ekranın
  // köşesinde beliren toast, barkod okutan kişinin baktığı yerde değil.
  const [koliMesaji, setKoliMesaji] = useState("");
  const [teslimDefter, setTeslimDefter] = useState(siparis.defterTercihi || "Genel");
  const [siparisSilOnayGoster, setSiparisSilOnayGoster] = useState(false);
  // Kart içi sekme: "kalemler" | "rezervasyon". Rezervasyon bilgisi kalemlerin arasına sıkışmak
  // yerine kendi sekmesinde durur — kalem listesi uzunken görünmez hale geliyordu.
  const [kartSekme, setKartSekme] = useState("kalemler");
  const cari = cariler.find((c) => c.id === siparis.cariId);
  // Kalemlerin, para birimine göre gruplu toplamı — hem başlıktaki toplam hesaplaması hem de aşağıdaki
  // "Fiş toplamını çevir" paneli için ortak kullanılır.
  const pbToplamlariHam = {};
  siparis.kalemler.forEach((k) => {
    const pb = k.paraBirimi || "TRY";
    pbToplamlariHam[pb] = (pbToplamlariHam[pb] || 0) + k.miktar * k.birimFiyat;
  });
  // Sipariş bir "Kayıt Para Birimi"ne ayarlanmışsa (Fiş Toplamını Çevir paneli üzerinden), başlıktaki
  // toplam HER ZAMAN o para biriminde, kayıtlı kurlarla hesaplanıp gösterilir — bu, sipariş bir kez bir
  // para birimine çevrildikten sonra tüm ekranlarda aynı birimle devam etmesini sağlar. Kayıt para
  // birimi ayarlanmamışsa, kalemlerin kendi para birimi (hepsi aynıysa) kullanılır (eskisi gibi).
  let toplam, toplamSembol;
  if (siparis.kayitParaBirimi) {
    const birlesikKurlar = { ...(kurlar || {}), ...(siparis.kayitKurlari || {}) };
    let toplamKayitPB = 0;
    let hepsiCevrilebildi = true;
    Object.entries(pbToplamlariHam).forEach(([pb, tut]) => {
      const cevrilmis = paraCevirGenel(tut, pb, siparis.kayitParaBirimi, birlesikKurlar);
      if (cevrilmis == null) { hepsiCevrilebildi = false; return; }
      toplamKayitPB += cevrilmis;
    });
    toplam = hepsiCevrilebildi ? toplamKayitPB : siparis.kalemler.reduce((sum, k) => sum + k.miktar * k.birimFiyat, 0);
    toplamSembol = hepsiCevrilebildi ? (PARA_SEMBOLU[siparis.kayitParaBirimi] || siparis.kayitParaBirimi) : "₺";
  } else {
    toplam = siparis.kalemler.reduce((sum, k) => sum + k.miktar * k.birimFiyat, 0);
    // Kalemler AYNI para biriminde ise onun sembolü kullanılır; farklı para birimleri karışıksa
    // (nadir), varsayılan TL sembolüne düşülür — kalem tablosu her kalemin kendi para birimini
    // zaten ayrı ayrı doğru gösteriyor, bu sadece ÖZET/başlık gösterimi içindir.
    const kalemPBleriHepsiAyniMi = new Set(siparis.kalemler.map((k) => k.paraBirimi || "TRY")).size <= 1;
    toplamSembol = kalemPBleriHepsiAyniMi && siparis.kalemler[0] ? (PARA_SEMBOLU[siparis.kalemler[0].paraBirimi || "TRY"] || siparis.kalemler[0].paraBirimi) : "₺";
  }
  const durumRenk = SIPARIS_DURUM_RENK[siparis.durum] || "var(--erp-text-2)";
  const eksikVar = siparis.kalemler.some((k) => (k.karsilanan || 0) < k.miktar);
  const tedarikOzeti = siparisTedarikDurumuHesapla(siparis, tumSiparisler, uretimSiparisleri);

  useEffect(() => {
    if (baslangicAcik) {
      setOpen(true);
      if (onGoruldu) onGoruldu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baslangicAcik]);

  const [teslimOnayGoster, setTeslimOnayGoster] = useState(false);

  function teslimSubmit() {
    const teslimler = tumTeslimKalemleri.map(teslimSatiri).filter((t) => t.miktar > 0);
    if (teslimler.length === 0) return;
    setTeslimOnayGoster(true);
  }

  function teslimOnayla() {
    const teslimler = tumTeslimKalemleri.map(teslimSatiri).filter((t) => t.miktar > 0);
    onGerceklestir(siparis.id, teslimler, teslimDefter, okutulanKoliler);
    setTeslimMiktarlar({});
    setTeslimFiyatlar({}); setTeslimPBler({});
    setEkKalemler([]); setEkKalemSiparisi({}); setSiparistenSecAcik(false);
    setTeslimOnayGoster(false);
    setShowTeslim(false);
    setTeslimDefter("Genel");
  }

  // HAZIR ÜRÜNLERİ FİŞE KOY (kullanıcı, 12 Eylül). Üretilmiş / teslim alınmış miktar kadar;
  // `tumunuDoldur` ile aynı iki state'e yazıyor, ikinci bir doldurma mantığı yok.
  function hazirlariDoldur(sadeceGrup) {
    const hazirlar = siparisHazirKalemleri(siparis, tumSiparisler, uretimSiparisleri, stok)
      .filter((h) => !sadeceGrup || `${h.urunId}|${h.renk}` === sadeceGrup);
    if (hazirlar.length === 0) return;
    setTeslimMiktarlar((onceki) => {
      const next = { ...onceki };
      hazirlar.forEach((h) => { next[h.kalemId] = String(h.hazir); });
      return next;
    });
    setEklenenGruplar((onceki) => {
      const next = [...onceki];
      hazirlar.forEach((h) => { const a = `${h.urunId}|${h.renk}`; if (!next.includes(a)) next.push(a); });
      return next;
    });
  }

  function tumunuDoldur() {
    const next = {};
    const gruplar = [];
    siparis.kalemler.forEach((k) => {
      const kalan = k.miktar - (k.karsilanan || 0);
      if (kalan <= 0) return;
      next[k.id] = String(kalan);
      const anahtar = `${k.urunId}|${k.renk}`;
      if (!gruplar.includes(anahtar)) gruplar.push(anahtar);
    });
    setTeslimMiktarlar(next);
    // Satırlar da açılır: miktar dolu ama satır ekranda yoksa kullanıcı ne çıkacağını göremezdi.
    setEklenenGruplar(gruplar);
  }

  return (
    <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
      <div
        role={baslangicAcik ? undefined : "button"}
        tabIndex={baslangicAcik ? undefined : 0}
        onClick={baslangicAcik ? undefined : () => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          // Liste içinde bu şerit yalnızca iki küçük kontrol taşır; 14px'lik dolgu boş bir bant
          // gibi görünüyordu.
          padding: baslangicAcik ? "10px 14px 0" : 14,
          background: "transparent", border: "none", cursor: baslangicAcik ? "default" : "pointer", textAlign: "left", flexWrap: "wrap",
        }}
      >
        {/* Kart bir listenin İÇİNDE açıldığında (baslangicAcik) bu başlık, hemen üstündeki özet
            satırının birebir tekrarıdır: aynı sipariş no, aynı cari, aynı durum, aynı tutar. Tekrar,
            hangi bilginin hangi satıra ait olduğunu belirsizleştiriyor ve kartı üstündeki özetten
            kopukmuş gibi gösteriyordu.
            Bu yüzden bilgi kısmı yalnızca kart TEK BAŞINA gösterildiğinde (pencere/yazdırma gibi)
            çizilir; listede yalnızca eylemler (durum, sil) kalır. */}
        {!baslangicAcik && (<>
        <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{siparis.siparisNo}</span>
        {siparis.musteriKodu && (
          <span
            className="mono"
            title={`${siparis.tip === "Alış" ? "Tedarikçi" : "Müşteri"} sipariş kodu`}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 7px", borderRadius: "var(--erp-r-pill)" }}
          >
            #{siparis.musteriKodu}
          </span>
        )}
        {siparis.ambalaj && siparis.ambalaj.renk && (
          <span
            className="mono"
            title={`Bu siparişin kutusu: ${siparis.ambalaj.renk}. Reçetedeki ambalaj renginin yerine geçer.`}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-brown)", background: "#8A5A3818", padding: "1px 7px", borderRadius: "var(--erp-r-pill)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Package size={11} /> {siparis.ambalaj.renk}
          </span>
        )}
        {siparis.kayitParaBirimi && (
          <span
            className="mono"
            title="Fiş kayıt para birimi"
            style={{ fontSize: 11, fontWeight: 700, color: "#2F6B4F", background: "#2F6B4F1A", padding: "1px 7px", borderRadius: "var(--erp-r-pill)" }}
          >
            {siparis.kayitParaBirimi}
          </span>
        )}
        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{siparis.tarih || siparis.olusturuldu ? tarihYaz(siparis.olusturuldu || siparis.tarih) : "—"}</span>
        <span style={{ fontSize: 13, color: "var(--erp-text)", fontWeight: 600 }}>{cari ? cari.unvan : "—"}</span>
        <span
          className="mono"
          style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: alfaEkle(durumRenk, "22"), color: durumRenk,
          }}
        >
          {siparis.durum}
        </span>
        {siparis.durum !== "İptal" && (
          tedarikOzeti ? (
            <span
              className="mono"
              title="Bu siparişteki eksik kalemler için planlanan satın alma/üretimin durumu"
              style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
                background: alfaEkle(tedarikOzeti.renk, "22"), color: tedarikOzeti.renk,
              }}
            >
              {tedarikOzeti.metin}
            </span>
          ) : eksikVar ? (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-warn)" }}>Eksik var</span>
          ) : (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-primary)" }}>Tam karşılandı</span>
          )
        )}
        <span className="mono" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14 }}>
          {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {toplamSembol}
        </span>
        {open ? <ChevronDown size={18} color="var(--erp-text-3)" /> : <ChevronRight size={18} color="var(--erp-text-3)" />}
        </>)}

        {/* DURUM ve SİL, kart BAŞLIĞINDA — ürün ve cari kartlarıyla aynı düzen.
            Önceden kartın en altında, tüm kalemlerin ve sekmelerin ardındaydılar; uzun bir siparişte
            durumu değiştirmek için sonuna kadar kaydırmak gerekiyordu.
            stopPropagation şart: başlık aynı zamanda kartın aç/kapa alanı, tıklama oraya sızarsa
            durum seçerken kart kapanır. */}
        {/* DURUM ARTIK SEÇİLMİYOR, GÖSTERİLİYOR (kullanıcı, 7 Eylül: "sipariş durumu manuel
            kaldıralım, gerek yok çünkü sipariş hareketi ile durum belirleniyor").

            Elle seçim, hareketlerin hesapladığı durumla ÇELİŞEBİLİYORDU: kullanıcı "Tamamlandı"
            seçse de teslim edilmemiş kalem duruyorsa liste onu bekleyen sayıyordu. İki kaynak,
            biri yalan.

            Silme SALT-OKUNUR önizlemede yine gizli: listede hızlıca bakarken yanlışlıkla sipariş
            silmek kolaydı. */}
        <span
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: baslangicAcik ? 0 : "auto" }}
        >
          <span
            className="mono"
            title="Durum, siparişin hareketlerinden hesaplanır"
            style={{
              padding: "4px 10px", borderRadius: "var(--erp-r-pill)", border: `1.5px solid ${durumRenk}`,
              color: durumRenk, fontWeight: 700, fontSize: 11, background: alfaEkle(durumRenk, "14"), whiteSpace: "nowrap",
            }}
          >
            {siparis.durum}
          </span>
          {!saltOkunur && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* DÜZENLE = SİPARİŞ FORMU (25 Eylül — kullanıcı: "düzenle deyince arkada yeni sipariş
                  girişi gibi çalışıyor ve üstteki ekranı kapatman gerekiyor"). Eskiden ✎ kartın içinde
                  başlık kutuları açıyor, "+" / "Ürün Ekle" ise formu tam ekran kartın ARKASINDA
                  açıyordu. Artık tek yol: form önde açılıyor, girilmiş kalemler altta düzenlenebilir
                  (planlanmış/teslim alınmış olanlar kilitli), ürün ekleme de aynı formda. */}
              <KayitEylemleri
                onDuzenle={open && onDuzenle ? () => onDuzenle(siparis.id) : undefined}
                duzenleBaslik="Düzenle — sipariş formunda açılır: başlık, ürün ekleme, bekleyen kalemlerde ürün/renk/miktar/fiyat"
                onSil={() => { setOpen(true); setSiparisSilOnayGoster(true); }}
                silBaslik="Siparişi sil"
              />
            </span>
          )}
          {/* Yazdır ve WhatsApp SALT OKUNURDA DA var (listeden açılan kart): çıktı almak düzenleme değil. */}
          {open && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* YAZDIR + WHATSAPP (kullanıcı, 13 Eylül). Dosya adı "SAT-1002 - Cari Adı"; WhatsApp
                  cari kartındaki numaraya sipariş özetiyle açılır (bkz. siparisWhatsappBaglantisi). */}
              {/* PAYLAŞ ŞERİDİ (13 Eylül): PDF · WhatsApp · E-posta — her belgede aynı bileşen. */}
              {(() => {
                const cariK = cariler.find((c) => c.id === siparis.cariId);
                return (
                  <PaylasSeridi
                    govdeHTML={siparisCiktisiHTML(siparis, cariK, firmaBilgileri, stok)}
                    dosyaAdi={`${siparis.siparisNo || "siparis"} - ${(cariK && cariK.unvan) || "cari"}`}
                    cari={cariK}
                    konu={`${siparis.tip === "Alış" ? "Alış siparişi" : "Sipariş"} ${siparis.siparisNo || ""} — ${(firmaBilgileri && firmaBilgileri.unvan) || ""}`.trim()}
                    ozet={siparisMetinOzeti(siparis, cariK)}
                    showToast={showToast} firmaBilgileri={firmaBilgileri}
                  />
                );
              })()}
            </span>
          )}
        </span>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Silme onayı kart gövdesinin EN BAŞINDA: tetikleyici düğme başlıkta olduğu için
              onay da görüş alanında olmalı. Altta kalsaydı uzun bir siparişte kullanıcı silme
              ikonuna basıp hiçbir şey olmamış gibi görürdü. */}
          {siparisSilOnayGoster && (() => {
            // Bu siparişe (kalemleri üzerinden Tedarik Planlama ile) bağlı, hâlâ var olan Üretim ya da
            // Alış siparişlerini bulur — bunlardan biri varsa kullanıcıyı bilgilendirip onay ister.
            const bagliUretimler = (uretimSiparisleri || []).filter((o) =>
              siparis.kalemler.some((k) => k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === o.siparisNo)
            );
            const bagliAlislar = (tumSiparisler || []).filter((s) =>
              s.tip === "Alış" && siparis.kalemler.some((k) => k.planlama && k.planlama.tip === "Satınalma" && k.planlama.referansNo === s.siparisNo)
            );
            const bagliVarMi = bagliUretimler.length > 0 || bagliAlislar.length > 0;
            return (
              <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginTop: 10 }}>
                {bagliVarMi ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 6 }}>
                      ⚠ Bu sipariş için üretim ve/veya satın alma işlemi yapılmış:
                    </div>
                    <div style={{ display: "grid", gap: 3, marginBottom: 8, fontSize: 12 }}>
                      {bagliUretimler.map((o) => (
                        <div key={o.id}>• Üretim: <span className="mono" style={{ fontWeight: 700 }}>{o.siparisNo}</span> ({o.model}, {o.stogaEklendiMi ? "tamamlandı" : "devam ediyor"})</div>
                      ))}
                      {bagliAlislar.map((s) => (
                        <div key={s.id}>• Alış Siparişi: <span className="mono" style={{ fontWeight: 700 }}>{s.siparisNo}</span> ({s.durum})</div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 8 }}>
                      Bu siparişi silmek, bu bağlantıları etkileyebilir. Önce ilgili üretim/alış kayıtlarını
                      kontrol etmenizi öneririz. Yine de devam etmek istiyor musunuz?
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                    Bu siparişi silmek istediğinize emin misiniz?
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { onSil(siparis.id); setSiparisSilOnayGoster(false); }}>
                    Evet, Sil
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSiparisSilOnayGoster(false)}>
                    Vazgeç
                  </button>
                </div>
              </div>
            );
          })()}
          {/* Tarih / teslim / toplam adet / tutar, kartın ÜST BAŞLIĞINDA zaten var — burada tekrar
              etmek hem yer kaplıyor hem aynı bilgiyi iki kez okutuyordu.
              NOT ise başlıkta yok; yalnızca o gösterilir. */}
          {/* NOT. Başlık düzenleme kartın içinde değil, sipariş formunda (✎ Düzenle). */}
          {!saltOkunur && siparis.not && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--erp-text-2)", alignItems: "flex-start", flexWrap: "wrap" }}>
              <FileText size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <NotKaynakla not={siparis.not} tumSiparisler={tumSiparisler} onSiparisGit={onSiparisGit} />
            </div>
          )}
          {saltOkunur && siparis.not && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--erp-text-2)", alignItems: "flex-start" }}>
              <FileText size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <NotKaynakla not={siparis.not} tumSiparisler={tumSiparisler} onSiparisGit={onSiparisGit} />
            </div>
          )}


          {Object.keys(pbToplamlariHam).length > 0 && (
            !saltOkunur && <FisToplamCeviriPaneli
              pbToplamlari={pbToplamlariHam}
              kurlar={kurlar}
              deger={{ kayitParaBirimi: siparis.kayitParaBirimi, kayitKurlari: siparis.kayitKurlari }}
              onDegistir={(yeni) => onKayitParaGuncelle && onKayitParaGuncelle(siparis.id, yeni.kayitParaBirimi, yeni.kayitKurlari)}
            />
          )}


          {/* Kalemler artık bir SEKME DEĞİL, kartın gövdesi. Siparişin ne olduğu her zaman
              görünmeli; sekmeler kalemlerin ALTINDA, ek bilgi katmanı olarak durur. */}
          {/* (kalem listesi — kartın gövdesi, sekme değil) */}
          {(() => {
            // "Kalemlere Ekle" ard arda tıklanırsa (eski davranışta) aynı ürün+renk+beden'e sahip
            // tekrar eden kalemler oluşabilirdi. Bu durum İKİ AYRI şekilde ele alınır:
            // 1) Hâlâ BEKLEYEN (planlanmamış) tekrarlar — güvenle otomatik birleştirilebilir.
            // 2) ZATEN PLANLANMIŞ tekrarlar — eğer AYNI planlama referansına (aynı üretim/satınalma
            //    siparişine) bağlıysalar yine güvenle birleştirilebilir; ama FARKLI referanslara
            //    bağlıysalar (örn. biri ALS-1001'e, diğeri ALS-1002'ye planlanmışsa) bunlar GERÇEKTEN
            //    ayrı iki tedarik kaydını temsil eder — otomatik birleştirmek o izlenebilirliği
            //    kaybettirir, bu yüzden sadece UYARILIR, otomatik birleştirilmez.
            const bekleyenler = siparis.kalemler.filter((k) => !k.planlama);
            const bekleyenAnahtarlar = bekleyenler.map((k) => `${k.urunId}|${k.renk}|${k.beden}`);
            const bekleyenTekrarVar = new Set(bekleyenAnahtarlar).size < bekleyenAnahtarlar.length;

            const planlanmislar = siparis.kalemler.filter((k) => k.planlama);
            const planliGruplar = {};
            planlanmislar.forEach((k) => {
              const anahtar = `${k.urunId}|${k.renk}|${k.beden}`;
              (planliGruplar[anahtar] = planliGruplar[anahtar] || []).push(k);
            });
            const farkliReferanslaPlanliTekrar = Object.values(planliGruplar).some(
              (grup) => grup.length > 1 && new Set(grup.map((k) => k.planlama.referansNo)).size > 1
            );
            const ayniReferanslaPlanliTekrarVar = Object.values(planliGruplar).some(
              (grup) => grup.length > 1 && new Set(grup.map((k) => k.planlama.referansNo)).size === 1
            );

            if (!bekleyenTekrarVar && !farkliReferanslaPlanliTekrar && !ayniReferanslaPlanliTekrarVar) return null;
            if (!onKalemleriBirlestir || saltOkunur) return null;
            return (
              <div style={{ background: "var(--erp-orange-bg)", border: "1px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "6px 10px", marginBottom: 10, display: "grid", gap: 6 }}>
                {(bekleyenTekrarVar || ayniReferanslaPlanliTekrarVar) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <AlertTriangle size={14} color="var(--erp-warn)" />
                    <span style={{ fontSize: 12, color: "var(--erp-warn)" }}>
                      Aynı ürün/renk/beden için tekrar eden kalemler tespit edildi{ayniReferanslaPlanliTekrarVar ? " (bazıları zaten aynı fişe planlanmış)" : ""}.
                    </span>
                    <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "3px 8px", marginLeft: "auto" }} onClick={() => onKalemleriBirlestir(siparis.id)}>
                      Tekrarları Birleştir
                    </button>
                  </div>
                )}
                {farkliReferanslaPlanliTekrar && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <AlertTriangle size={14} color="var(--erp-warn)" />
                    <span style={{ fontSize: 12, color: "var(--erp-warn)" }}>
                      Aynı ürün/renk/beden için, FARKLI fişlere (üretim/satınalma) planlanmış tekrar eden kalemler var — bunlar otomatik birleştirilmiyor, çünkü ayrı tedarik kayıtlarını temsil ediyorlar. Elle kontrol etmeniz gerekiyor.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display: "grid", gap: 8 }}>
            {(() => {
              // Sipariş kalemlerinin gösterimi, artık "her renk ayrı kart" yerine "Tedarik Planlama"daki
              // gibi TEK bir matris tablosu: satırlar = renk, sütunlar = TÜM bedenlerin birleşimi — aynı
              // ürünün farklı renkleri artık kart kart tekrar etmiyor, tek bir tabloda yan yana.
              const urunGruplari = [];
              const urunIndex = {};
              siparis.kalemler.forEach((k) => {
                if (!(k.urunId in urunIndex)) {
                  urunIndex[k.urunId] = urunGruplari.length;
                  urunGruplari.push({ urunId: k.urunId, urunAd: k.urunAd, birim: k.birim, kalemler: [] });
                }
                urunGruplari[urunIndex[k.urunId]].kalemler.push(k);
              });
              return urunGruplari.map((ug) => {
                const renkGruplari = [];
                const renkIndex = {};
                ug.kalemler.forEach((k) => {
                  if (!(k.renk in renkIndex)) {
                    renkIndex[k.renk] = renkGruplari.length;
                    renkGruplari.push({ renk: k.renk, kalemler: [] });
                  }
                  renkGruplari[renkIndex[k.renk]].kalemler.push(k);
                });
                const tumBedenler = Array.from(new Set(ug.kalemler.map((k) => k.beden)));
                const toplamAdet = ug.kalemler.reduce((s, k) => s + k.miktar, 0);
                // Eksik/bozuk fiyat alanı toplamı NaN yapıp tüm kartı çökertmesin.
                const toplamTutar = ug.kalemler.reduce((s, k) => s + (k.miktar || 0) * (k.birimFiyat || 0), 0);
                const urun = (stok || []).find((p) => p.id === ug.urunId);
                return (
                  // ÜRÜN BAŞLIĞI TABLONUN İÇİNE ALINDI.
                  //
                  // Önceden ayrı bir satırdı: resim + ad üstte, tablo altta. İki satır yer
                  // kaplıyor ve aralarındaki bağ görsel olarak kopuyordu — birden çok ürünlü
                  // siparişte hangi tablonun hangi ürüne ait olduğu sürekli yeniden aranıyordu.
                  //
                  // Şimdi resim ve ad, başlık satırı + renk satırları boyunca uzanan TEK hücrede.
                  // Hem yer kazanılıyor hem aidiyet bir bakışta belli oluyor.
                  <div key={ug.urunId} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      {/* TABLO GÖRÜNÜMÜ (kullanıcı, 15 Eylül: "listeyi tablo şeklinde yapalım, daha
                          renkli ve tabloyu andıran"). Matris çizgisizdi: hücreler yalnız boşlukla
                          ayrılıyordu ve göz hangi sayının hangi bedene ait olduğunu takip etmek
                          zorunda kalıyordu. `matris-tablo` sınıfı başlık zemini, ince dikey çizgiler
                          ve zebra satır veriyor; sınıf tek yerde tanımlı (100-app), bütün matrisler
                          aynı görünüyor. */}
                      <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td
                              // +1 başlık satırı, +1 de (varsa) toplam satırı için.
                              rowSpan={renkGruplari.length + 1 + (renkGruplari.length > 1 ? 1 : 0)}
                              style={{
                                padding: "10px 12px", verticalAlign: "middle", textAlign: "center",
                                background: siparis.tip === "Alış" ? "#8A5A3812" : "#3D6B8A12",
                                borderRight: `2px solid ${siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)"}`,
                                minWidth: 132,
                              }}
                            >
                              {/* Resim BÜYÜK: ayakkabı modelini ayırt etmenin en hızlı yolu görseldir.
                                  Altına adet ve tutar yazmak hem resmi küçültüyor hem de aynı bilgiyi
                                  ikinci kez gösteriyordu — birim fiyat ve tutar zaten satırlarda var,
                                  adet de beden hücrelerinin toplamı. */}
                              <ColorSwatch src={urun ? urun.kapakResmi : null} editable={false} size={92} />
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", marginTop: 6, lineHeight: 1.3 }}>
                                {ug.urunAd}
                              </div>
                            </td>
                            <th style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", textAlign: "center", padding: "5px 8px" }}>Renk</th>
                            {tumBedenler.map((b) => (
                              <th key={b} className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", textAlign: "center", padding: "5px 6px", whiteSpace: "nowrap" }}>{b}</th>
                            ))}
                            {/* ADET sütunu: bu rengin toplam miktarı. Beden hücrelerini toplamak
                                zorunda kalmak, en sık bakılan sayıyı en zor ulaşılan yere koyuyordu. */}
                            <th className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", padding: "5px 10px", whiteSpace: "nowrap", color: "var(--erp-text)" }}>Adet</th>
                            <th className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", padding: "5px 10px", whiteSpace: "nowrap", color: "var(--erp-text)" }}>Birim</th>
                            <th className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", padding: "5px 10px", whiteSpace: "nowrap", color: "var(--erp-text)" }}>Tutar</th>
                            <th style={{ fontSize: 12, fontWeight: 700, textAlign: "left", padding: "5px 10px", whiteSpace: "nowrap", color: "var(--erp-text)" }}>Durum</th>
                          </tr>
                          {renkGruplari.map((rg) => {
                            // SİPARİŞ MİKTARI BÖLÜNMÜŞ KALEMLERDE DE TAM (kullanıcı, 19 Eylül:
                            // "üstte siparişin tamamı görünecek, sipariş planlandığında üstte
                            // değişiklik olmayacak").
                            //
                            // Planlama yapılınca kalem İKİYE BÖLÜNÜYOR: planlanan parça + kalan
                            // parça (100-app, `uretimPlanla`). Bu doğru bir kayıt tekniği — her
                            // parça kendi tedarik kaydını taşıyor. Ama matris her bedene TEK kalem
                            // koyuyordu (son yazılan kazanıyordu), o yüzden 144 çiftlik sipariş
                            // planlandıkça 136'ya, sonra daha da aşağı düşüyor görünüyordu.
                            //
                            // Artık aynı renk+beden için BÜTÜN kalemler toplanıyor: üst matris
                            // siparişin kendisini gösteriyor, bölünme oraya yansımıyor. Kilit ve
                            // karşılanma bilgisi parçaların birleşiminden hesaplanıyor.
                            const kalemBedenIndex = {};
                            rg.kalemler.forEach((k) => {
                              const mevcut = kalemBedenIndex[k.beden];
                              if (!mevcut) { kalemBedenIndex[k.beden] = { ...k, parcalar: [k] }; return; }
                              mevcut.miktar = (mevcut.miktar || 0) + (k.miktar || 0);
                              mevcut.karsilanan = (mevcut.karsilanan || 0) + (k.karsilanan || 0);
                              // Parçalardan biri planlanmışsa hücre kilitli: düzenleme tam ekranda
                              // ve parça bazında yapılıyor.
                              mevcut.planlama = mevcut.planlama || k.planlama;
                              mevcut.parcalar.push(k);
                            });
                            return (
                              <tr key={rg.renk} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                                {/* KÜÇÜK RESİM KALDIRILDI: hemen solda ürünün 92 piksellik görseli
                                    duruyor. Aynı ürünün küçük bir kopyasını her renk satırında
                                    tekrarlamak yer kaplıyor ve renk adını sağa itiyordu.
                                    Renk adı artık ortalanmış ve tek başına. */}
                                <td style={{ padding: "5px 8px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", textAlign: "center", color: "var(--erp-text)" }}>
                                  {rg.renk}
                                </td>
                                {tumBedenler.map((b) => {
                                  const k = kalemBedenIndex[b];
                                  if (!k) return <td key={b}></td>;
                                  const karsilanan = k.karsilanan || 0;
                                  const kalanMiktar = k.miktar - karsilanan;
                                  // Bir kalem PLANLANMIŞSA (üretim/satın alma siparişine bağlanmışsa) ya da
                                  // kısmen dahi olsa karşılanmışsa, artık silinip/düzenlenemez.
                                  // saltOkunur önizlemede her kalem kilitli sayılır — düzenleme yalnızca
                                  // tam ekranda yapılır.
                                  const kilitli = saltOkunur || !!k.planlama || karsilanan > 0;
                                  if (kilitli) {
                                    return (
                                      <td key={b} style={{ padding: "5px 6px", textAlign: "center" }}>
                                        <span
                                          className="mono"
                                          title={`${karsilanan}/${k.miktar} karşılandı · ` + (k.planlama ? "Planlanmış, düzenlenemez" : karsilanan > 0 ? "Kısmen işlenmiş, düzenlenemez" : "")}
                                          style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: "var(--erp-text)" }}
                                        >
                                          {/* SADE HÜCRE (kullanıcı, 15 Eylül; ikinci kez: "hâlâ
                                              görünüyor"). Kesir YALNIZ KISMİ karşılamada anlamlı:
                                              hiç karşılanmamışsa "0/2 (−2)" aynı şeyi üç kez söyler,
                                              tamamı karşılanmışsa "2/2" gereksiz. Kural:
                                                karşılanan 0        → 2
                                                0 < karşılanan < 2  → 1/2 (−1)
                                                karşılanan = toplam → 2
                                              Ayrıntı ipucunda; döküm Planlama ve Fişler sekmelerinde. */}
                                          {/* SİPARİŞ MİKTARI SABİT (kullanıcı, 18 Eylül: "sipariş aslında 144 çift
                                              toplamı; üst satır sipariş toplamı ama aşağıdan planlama yaptıkça
                                              değişiyor ve kafa karıştırıyor. Planlama yapılanlar zaten aşağıda
                                              görünüyor ve sekmelerde toparlanıyor").
                                              Hücre artık HER ZAMAN sipariş miktarını gösteriyor: üst matris
                                              "ne istendi" sorusunun cevabı ve o değişmez. Karşılanma durumu
                                              hücrenin RENGİNDEN ve ipucundan anlaşılıyor; dökümü Tedarik
                                              Planlama ve Fişler sekmelerinde. */}
                                          {k.miktar}
                                          {karsilanan > 0 && (
                                            <span title={`${karsilanan}/${k.miktar} karşılandı`}
                                              style={{ width: 6, height: 6, borderRadius: "var(--erp-r-sm)", flexShrink: 0,
                                                background: kalanMiktar > 0 ? "var(--erp-warn)" : "var(--erp-primary)" }} />
                                          )}
                                        </span>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={b} style={{ padding: "5px 6px", textAlign: "center" }}>
                                      <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                                        {/* Miktar burada yalnız GÖSTERİLİR; değiştirmek ✎ Düzenle ile sipariş formunda. */}
                                        {k.miktar}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="mono" style={{ padding: "5px 10px", textAlign: "right", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
                                  {rg.kalemler.reduce((t, k) => t + (k.miktar || 0), 0)} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>{ug.birim}</span>
                                </td>
                                {/* BİRİM FİYAT — bu rengin çift/adet başına fiyatı.
                                    Aynı renkte farklı bedenler farklı fiyatta olabiliyor; öyleyse
                                    aralık gösterilir, tek bir sayı uydurmak yanlış olurdu. */}
                                <td className="mono" style={{ padding: "5px 10px", textAlign: "right", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
                                  {(() => {
                                    const fiyatlar = Array.from(new Set(rg.kalemler.map((k) => k.birimFiyat || 0)));
                                    const sembol = PARA_SEMBOLU[rg.kalemler[0].paraBirimi || "TRY"] || rg.kalemler[0].paraBirimi;
                                    const yaz = (x) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
                                    return fiyatlar.length === 1
                                      ? `${yaz(fiyatlar[0])} ${sembol}`
                                      : `${yaz(Math.min(...fiyatlar))}–${yaz(Math.max(...fiyatlar))} ${sembol}`;
                                  })()}
                                </td>
                                {/* SATIR TUTARI — bu rengin toplam bedeli. Sipariş toplamının
                                    hangi renkten geldiğini görmek, fiyat tartışmasında gerekli. */}
                                <td className="mono" style={{ padding: "5px 10px", textAlign: "right", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
                                  {rg.kalemler
                                    .reduce((t, k) => t + (k.miktar || 0) * (k.birimFiyat || 0), 0)
                                    .toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
                                  {PARA_SEMBOLU[rg.kalemler[0].paraBirimi || "TRY"] || rg.kalemler[0].paraBirimi}
                                </td>
                                {/* SATIR DURUMU — bu renk için tedarik nerede.
                                    Kalemler aynı renkte farklı bedenler olsa da planlama renk
                                    bazında yapıldığı için tek bir durum yeterli; farklıysa
                                    en geride olan gösterilir. */}
                                <td style={{ padding: "5px 12px", whiteSpace: "nowrap" }}>
                                  {(() => {
                                    const durumlar = rg.kalemler.map((k) => {
                                      // FAZLA SEVK UYARISI (kullanıcı, 19 Eylül: "fazla satış
                                      // yaptık, bunu belirtmesi gerekli"). Karşılanan miktar
                                      // siparişi AŞTIĞINDA eskiden yine "Teslim edildi" yazıyordu;
                                      // 136 çiftlik siparişe 160 çift sevk edildiği ekranda hiçbir
                                      // yerde görünmüyordu. Fazla sevk bir hata değil (müşteri
                                      // fazladan istemiş olabilir) ama SESSİZ kalması hata: fatura
                                      // ile sipariş tutmaz ve fark aylar sonra bulunur.
                                      if ((k.karsilanan || 0) > k.miktar) {
                                        return {
                                          metin: `Fazla sevk (+${(k.karsilanan || 0) - k.miktar})`,
                                          renk: "var(--erp-warn)", sira: 5,
                                          ipucu: `Sipariş ${k.miktar}, sevk edilen ${k.karsilanan || 0} — aradaki fark faturaya yansımalı`,
                                        };
                                      }
                                      if ((k.karsilanan || 0) >= k.miktar) return { metin: "Teslim edildi", renk: "var(--erp-primary)", sira: 5 };
                                      if (!k.planlama) return { metin: "Planlanacak", renk: "var(--erp-text-3)", sira: 0 };
                                      if (k.planlama.tip === "Satınalma") {
                                        const alis = (tumSiparisler || []).find((s) => s.siparisNo === k.planlama.referansNo);
                                        if (alis && alis.durum === "Tamamlandı") return { metin: "Geldi", renk: "var(--erp-primary)", sira: 4 };
                                        if (alis && alis.durum === "Kısmi Teslim") return { metin: "Kısmen geldi", renk: "#C97B3D", sira: 2 };
                                        return { metin: `Alış siparişi ${k.planlama.referansNo}`, renk: "var(--erp-brown)", sira: 1, ikon: "alis" };
                                      }
                                      const ur = (uretimSiparisleri || []).find((o) => o.siparisNo === k.planlama.referansNo);
                                      if (!ur) return { metin: "Üretilecek", renk: "var(--erp-info)", sira: 1 };
                                      const ilerleme = ur.prosesIlerleme || [];
                                      const biten = ilerleme.filter((p) => p.tamamlandiMi).length;
                                      const siradaki = ilerleme.find((p) => !p.tamamlandiMi);
                                      const basladi = ilerleme.some((p) => p.tamamlandiMi || (p.atamalar || []).some((a) => a.verildiMi));
                                      if (ur.stogaEklendiMi) return { metin: "Üretildi", renk: "var(--erp-primary)", sira: 4 };
                                      if (!basladi) return { metin: "Üretilecek", renk: "var(--erp-info)", sira: 1 };
                                      return {
                                        metin: siradaki ? siradaki.proses : (ur.asama || "Üretim"),
                                        adim: `${biten}/${ilerleme.length}`,
                                        renk: prosesRengi(siradaki ? siradaki.proses : "Üretim"),
                                        sira: 2, ikon: "uretim",
                                      };
                                    });
                                    durumlar.sort((a, b) => a.sira - b.sira);
                                    // FAZLA SEVK HER ZAMAN ÖNE ÇIKAR (19 Eylül): renk grubunda en
                                    // "geri"deki durum gösteriliyor; fazla sevk en ileri aşama
                                    // olduğu için sıralamada sona düşüyor ve hiç görünmüyordu.
                                    // Oysa bu bir UYARI: sessiz kalırsa fatura ile sipariş tutmaz.
                                    const d = durumlar.find((x) => x.sira === 5) || durumlar[0];
                                    if (!d) return null;
                                    return (
                                      <span
                                        className="mono"
                                        title={d.ipucu || undefined}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: 5,
                                          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)",
                                          background: d.sira <= 2 && d.ikon ? d.renk : alfaEkle(d.renk, "22"),
                                          color: d.sira <= 2 && d.ikon ? "var(--erp-panel-2)" : d.renk,
                                        }}
                                      >
                                        {d.ikon === "uretim" && <Hammer size={10} />}
                                        {d.ikon === "alis" && <PackageCheck size={10} />}
                                        {d.metin}
                                        {d.adim && <span style={{ opacity: 0.75, fontWeight: 400 }}>{d.adim}</span>}
                                      </span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                          {/* ÜRÜN TOPLAMI — birden çok renkli siparişte ürünün genel adedi ve
                              bedeli. Resmin altında dururken resmi küçültüyordu; tablonun sonu
                              hem doğru yeri hem de renk satırlarıyla aynı hizada. */}
                          {renkGruplari.length > 1 && (
                            <tr style={{ borderTop: "2px solid var(--erp-line)", background: "var(--erp-panel)" }}>
                              <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "var(--erp-text)", textAlign: "center" }}>Toplam</td>
                              {tumBedenler.map((b) => (
                                <td key={b} className="mono" style={{ padding: "6px 6px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>
                                  {ug.kalemler.filter((k) => k.beden === b).reduce((t, k) => t + (k.miktar || 0), 0) || ""}
                                </td>
                              ))}
                              <td className="mono" style={{ padding: "6px 10px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>
                                {toplamAdet} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>{ug.birim}</span>
                              </td>
                              <td></td>
                              <td className="mono" style={{ padding: "6px 10px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--erp-text)" }}>
                                {toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
                                {PARA_SEMBOLU[ug.kalemler[0].paraBirimi || "TRY"] || ug.kalemler[0].paraBirimi}
                              </td>
                              <td></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* SIRA: kalemler → tedarik durumu (sekmeler) → sevk/alış fişi geçmişi.
              Fiş geçmişi EN ALTTA: siparişin nasıl karşılandığı, ne planlandığı bilindikten
              sonra bakılan bir kayıttır. Üstte durduğunda tedarik sekmelerini aşağı itiyor ve
              planlamaya ulaşmak için uzun bir fiş listesini geçmek gerekiyordu. */}
          {/* ---- KART İÇİ SEKMELER ----
              Kalemlerin ALTINDA duran ek bilgi katmanı. Kalem listesi kartın gövdesidir ve her
              zaman görünür; tedarik planlama ve rezervasyon ise duruma göre gerekli olan, yer
              kaplayan bölümlerdir — sekmeye alınınca kart kısalıyor ve hangisine bakılacağı
              seçilebiliyor.
              Sekme yoksa (planlanacak bir şey ve rezervasyon yoksa) şerit hiç çizilmez. */}
          {(() => {
            // Tedarik planlama, doğası gereği DEĞİŞİKLİK yapan bir ekran (üretim/satın alma açar).
            // Salt-okunur önizlemede gizlenir; bilgi amaçlı sekmeler (ihtiyaç, alışlar) kalır.
            // Sekmeler (tedarik planlama, hammadde ihtiyacı, alışlar) yalnızca TAM EKRANDA çıkar.
            // Listede aşağı açılan önizlemede amaç "bu sipariş neydi" sorusunu cevaplamak; hammadde
            // tabloları orada kartı üç katına çıkarıp listeyi kullanılamaz hale getiriyordu.
            // Ayrıntıya bakmak isteyen kareye basıp tam ekrana geçer.
            if (saltOkunur) return null;

            const planlamaVar = siparis.tip === "Satış" && siparis.durum !== "İptal";
            const alisRezSayi = siparis.tip === "Alış" ? alisRezervasyonOzeti(siparis, tumSiparisler).length : 0;
            const hamAlisSayi = siparis.tip === "Satış" ? satisIcinHammaddeAlislari(siparis.id, tumSiparisler).length : 0;
            const rezSayi = alisRezSayi + hamAlisSayi;

            // Reçete/ihtiyaç sekmesi yalnızca SATIŞ siparişlerinde ve reçetesi olan bir kalem varsa
            // anlamlıdır: alış siparişinin hammadde ihtiyacı diye bir şey yok, hammaddenin kendisi
            // satın alınıyor.
            const ihtiyac = siparis.tip === "Satış" ? siparisHammaddeIhtiyaci(siparis, stok, tumSiparisler, stokRezervasyonlari) : null;
            const ihtiyacVar = !!(ihtiyac && (ihtiyac.kalemler.length > 0 || ihtiyac.recetesizKalem > 0));

            const sekmeler = [];
            // SEKME ADINDA EKSİK SAYISI (kullanıcı, 19 Eylül: "eksik miktarın üretimle mi satın
            // almayla mı geleceğini planlamamız lazım"). Planlanacak kalem sayısı sekmede
            // yazmıyordu; kullanıcı sekmeyi açmadan eksik olup olmadığını bilemiyordu ve
            // "planlama yok" diye okuyordu.
            const planlanacakSayisi = (siparis.kalemler || [])
              .filter((k) => (k.miktar || 0) - (k.karsilanan || 0) > 0).length;
            if (planlamaVar) sekmeler.push({
              key: "planlama",
              ad: planlanacakSayisi > 0 ? `Tedarik Planlama (${planlanacakSayisi} bekliyor)` : "Tedarik Planlama",
              renk: planlanacakSayisi > 0 ? "#C97B3D" : "var(--erp-info)",
              ikon: <Compass size={12} />,
            });
            if (ihtiyacVar) {
              const eksikSayisi = ihtiyac.kalemler.filter((x) => x.eksik > 0).length;
              sekmeler.push({
                key: "ihtiyac",
                ad: eksikSayisi > 0 ? `Hammadde İhtiyacı (${eksikSayisi} eksik)` : "Hammadde İhtiyacı",
                renk: eksikSayisi > 0 ? "var(--erp-warn)" : "var(--erp-primary)",
                ikon: <Layers size={12} />,
              });
            }
            // FİŞLER: tedarik girişleri (alış/üretim) + kesilen satış/alış fişleri.
            const tedarikGirisSayisi = siparis.tip === "Satış" ? siparisTedarikGirisleri(siparis, stok).length : 0;
            const fisliHareketSayisi = (() => {
              const c = cariler.find((x) => x.id === siparis.cariId);
              const h = ((c && c.hareketler) || []).filter((x) => (x.siparisId ? x.siparisId === siparis.id : x.siparisNo === siparis.siparisNo));
              return new Set(h.map((x) => x.fisNo || x.id)).size;
            })();
            if (tedarikGirisSayisi > 0 || fisliHareketSayisi > 0) {
              sekmeler.push({
                key: "fisler",
                ad: `Fişler (${fisliHareketSayisi + (tedarikGirisSayisi > 0 ? 1 : 0) > 0 ? fisliHareketSayisi || tedarikGirisSayisi : 0})`,
                renk: "var(--erp-brown)",
                ikon: <FileText size={12} />,
              });
            }
            if (rezSayi > 0) {
              sekmeler.push({
                key: "rezervasyon",
                ad: siparis.tip === "Alış" ? `Rezervasyon (${rezSayi})` : `Hammadde Alışları (${rezSayi})`,
                renk: "#9C3D3D",
                ikon: <Boxes size={12} />,
              });
            }
            // MOBİL BÖLÜM AYARI (kullanıcı, 15 Eylül): Tanımlar > Mobil Görünüm'de bu modülün
            // bölümleri için yapılan seçim YALNIZ DAR EKRANDA uygulanıyor — gizlenen sekme çıkmıyor,
            // sıra kullanıcının verdiği sıra. Masaüstünde hepsi eskisi gibi.
            const mobilBolum = mobilBolumAyari;   // sekme şeridi için
            // Gövdedeki `mobil-duzen` sınıfı tek doğruluk kaynağı: kullanıcı "her zaman mobil"
            // diyebiliyor ve dokunmatik geniş ekranlar da mobil sayılıyor (15 Eylül düzeltmesi).
            if (mobilBolum && typeof document !== "undefined" && document.body.classList.contains("mobil-duzen")) {
              const gizliler = mobilBolum.gizli || new Set();
              const sirali = (mobilBolum.sira || []).map((k) => sekmeler.find((x) => x.key === k)).filter(Boolean);
              const kalanlar = sekmeler.filter((x) => !(mobilBolum.sira || []).includes(x.key));
              sekmeler.length = 0;
              [...sirali, ...kalanlar].forEach((x) => { if (!gizliler.has(x.key)) sekmeler.push(x); });
            }
            if (sekmeler.length === 0) return null;

            // Açık sekme, mevcut sekmeler arasında yoksa ilkine düşülür: sipariş durumu değişince
            // (ör. iptal edilince planlama sekmesi kalkar) boş bir içerik kalmasın.
            const aktifKey = sekmeler.some((x) => x.key === kartSekme) ? kartSekme : sekmeler[0].key;

            return (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--erp-line-soft)", paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                  {sekmeler.map((x) => {
                    const aktif = aktifKey === x.key;
                    return (
                      <button
                        key={x.key}
                        type="button"
                        onClick={() => setKartSekme(x.key)}
                        style={{
                          padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: `1.5px solid ${aktif ? x.renk : "var(--erp-border-2)"}`,
                          background: aktif ? x.renk : "#fff",
                          color: aktif ? "#fff" : "var(--erp-text-2)",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {x.ikon}
                        {x.ad}
                      </button>
                    );
                  })}
                </div>

                {aktifKey === "planlama" && planlamaVar && (
                  <PlanlamaBolumu
                    siparis={siparis}
                    firmaBilgileri={firmaBilgileri}
                    showToast={showToast}
                    onFiseGitNo={onFiseGitNo}
                    stok={stok}
                    cariler={cariler}
                    tumSiparisler={tumSiparisler}
                    uretimSiparisleri={uretimSiparisleri}
                    onPlanlaUretim={onPlanlaUretim}
                    onPlanlaSatinAlma={onPlanlaSatinAlma}
                    onSiparisGit={onSiparisGit}
                    onGoToUretim={onGoToUretim}
                    onPlanlamaTemizle={onPlanlamaTemizle}
                    asortiler={asortiler}
                  />
                )}

                {aktifKey === "ihtiyac" && ihtiyac && (() => {
                  const toplamEksikMaliyet = ihtiyac.kalemler.reduce((s, x) => s + x.eksikMaliyet, 0);
                  const eksikler = ihtiyac.kalemler.filter((x) => x.eksik > 0);
                  return (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                          Bu siparişin reçetelerine göre toplam hammadde ihtiyacı ve mevcut stok durumu.
                        </span>
                        {toplamEksikMaliyet > 0 && (
                          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E18", color: "var(--erp-warn)" }}>
                            Eksiklerin tahmini maliyeti: {toplamEksikMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                          </span>
                        )}
                      </div>

                      {ihtiyac.recetesizKalem > 0 && (
                        <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 8, marginBottom: 8, fontSize: 11, color: "#7A3B22", lineHeight: 1.6 }}>
                          <AlertTriangle size={12} color="var(--erp-warn)" style={{ verticalAlign: -2, marginRight: 4 }} />
                          <b>{ihtiyac.recetesizKalem} kalemin reçetesi yok</b> — o kalemler bu hesaba dahil edilmedi.
                          Ürün kartı &gt; Reçete sekmesinden tanımlayın, aksi halde üretimde hammadde düşülmez.
                        </div>
                      )}

                      {ihtiyac.kalemler.length === 0 ? (
                        <EmptyState text="Reçeteye bağlı hammadde ihtiyacı bulunamadı." />
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {/* MATRİS GÖRÜNÜMÜ — her hammadde tek satır, bedenler sütun.
                              Önceki düz tablo aynı hammaddeyi her beden için tekrar yazıyordu;
                              beş bedenli bir modelde tek malzeme beş satır kaplıyor ve asıl
                              soru ("hangi bedende eksiğim var") tekrarın altında kayboluyordu.

                              Hücrede GEREKEN yazar; o bedende eksik varsa altında kırmızı eksik
                              miktarı çıkar. Stok ve rezerve sayıları satırdan kalkmadı, hücrenin
                              ipucuna (üzerine gelince) taşındı — ekranda her zaman durmaları
                              gerekmiyordu, ama gerektiğinde ulaşılabilir olmaları gerekiyordu. */}
                          {/* tanimlarProsesler boş geçiliyor: SiparisCard proses tanımlarını
                              almıyor ve eklemek prop zincirini birkaç seviye uzatırdı. Boş
                              listede ikon varsayılan eşlemeden çözülür (eski tabloda zaten ikon
                              yoktu) ve gruplar kalemlerin kendi sırasını korur — o sıra "eksiği
                              olanlar önce" demek, bu ekranda aranan da tam olarak budur. */}
                          <IhtiyacMatrisi
                            kalemler={ihtiyac.kalemler.map((x) => ({
                              ad: x.hammaddeAd, renk: x.renk, beden: x.beden,
                              birim: x.birim, miktar: x.gereken, proses: x.proses,
                              _k: x,
                            }))}
                            tanimlarProsesler={[]}
                            hucreCiz={(kaynak, deger) => {
                              const x = kaynak && kaynak._k;
                              if (!x) return deger;
                              return (
                                <span
                                  title={
                                    `${x.hammaddeAd} · ${x.renk} · ${x.beden}\n` +
                                    `Gereken: ${x.gereken} ${x.birim}\n` +
                                    `Stok: ${x.mevcutStok}${x.varyantYok ? " (bu renk/ölçü hammadde kartında TANIMSIZ)" : ""}\n` +
                                    (x.rezerve > 0
                                      ? `Bu siparişe ayrılmış: ${x.rezerve}${x.rezerveAcik > 0 ? ` (${x.rezerveAcik} açık)` : ""}`
                                      : "Rezervasyon yok")
                                  }
                                  style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.25, cursor: "help" }}
                                >
                                  <span style={{ color: x.eksik > 0 ? "var(--erp-warn)" : "var(--erp-text)", fontWeight: 700 }}>{deger}</span>
                                  {x.eksik > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)" }}>−{x.eksik}</span>
                                  )}
                                  {x.varyantYok && (
                                    <span title="Bu renk/ölçü hammadde kartında hiç tanımlı değil — stok 0 görünmesinin sebebi stoğun bitmesi değil" style={{ fontSize: 9, color: "var(--erp-warn)" }}>tanımsız</span>
                                  )}
                                </span>
                              );
                            }}
                          />
                          {/* Özet şerit: tabloda satır satır aranmasın diye toplam eksik ve
                              parasal karşılığı tek yerde. */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "7px 10px", background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)" }}>
                            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)" }}>
                              {ihtiyac.kalemler.length} hammadde kalemi
                            </span>
                            <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                              {eksikler.length > 0 ? `${eksikler.length} kalemde eksik` : "tümü stokta"}
                            </span>
                            <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: eksikler.length > 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                              {eksikler.length > 0
                                ? `${toplamEksikMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ eksik maliyeti`
                                : "✓ eksik yok"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 8, lineHeight: 1.6 }}>
                        Stok, o hammaddenin TOPLAM mevcudu — başka siparişler için ayrılmış olabilir.
                        Rezervasyonlu ve satın alma durumunu da dikkate alan ayrıntılı görünüm için
                        Planlama &gt; Sipariş İhtiyaç Planlama ekranını kullanın.
                      </div>
                    </div>
                  );
                })()}

                {/* FİŞLER SEKMESİ (kullanıcı, 15 Eylül: "sipariş ekranı çok doldu... 3 fiş sekmesi,
                    alış ve satış fişleri orada listelensin"). Tedarik girişleri + fiş geçmişi artık
                    sekmenin içinde; eskiden kartın altında alt alta duruyor ve ekranı dolduruyordu. */}
                {aktifKey === "fisler" && (
                  <>
              {/* TEDARİK GİRİŞLERİ (kullanıcı, 13 Eylül: "alış ve üretim giriş fişlerini bir sekmede
                  toplayalım, detay için oradan tıklayınca üretim veya alış fişine gitsin"). Bu
                  siparişe bağlı stoğa girişler: nereden, ne zaman, ne kadar; satır tıklanınca alış fişi
                  (Fişler) ya da üretim kartı açılır. Sevkten bağımsız — henüz satış yokken de görünür. */}
              {siparis.tip === "Satış" && (() => {
                const girisler = siparisTedarikGirisleri(siparis, stok);
                if (girisler.length === 0) return null;
                const [acik, setAcik] = [tedarikAcik, setTedarikAcik];
                const toplam = girisler.reduce((t, g) => t + g.miktar, 0);
                const git = (g) => {
                  if (g.kaynak === "Üretim") {
                    const u = (uretimSiparisleri || []).find((x) => x.id === g.uretimId || x.siparisNo === g.siparisNo);
                    if (u && onGoToUretim) return onGoToUretim(u.id);
                  }
                  if (g.fisNo && onFiseGitNo) return onFiseGitNo(g.fisNo);
                };
                return (
                  mobilBolumGizliMi(mobilBolumAyari, "tedarikGirisleri") ? null : (
                  <div data-tedarik-girisleri={girisler.length} style={{ marginTop: 14, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                    <div onClick={() => setAcik(!acik)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "var(--erp-panel-2)", cursor: "pointer" }}>
                      <PackageCheck size={13} color="var(--erp-primary)" />
                      <b className="mono" style={{ fontSize: 12 }}>Tedarik Girişleri</b>
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                        {girisler.length} giriş · {toplam} {girisler[0].birim} · {girisler.filter((g) => g.kaynak === "Üretim").length} üretim, {girisler.filter((g) => g.kaynak === "Satınalma").length} alış fişi
                      </span>
                      <span style={{ marginLeft: "auto" }}>{acik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                    </div>
                    {acik && (() => {
                      // MATRİS DÜZENİ (kullanıcı, 13 Eylül: "matris düzenini unutuyorsun hep"): satır =
                      // fiş/üretim + ürün + renk, sütun = beden. Beden başına satır 5 bedenli bir alışı
                      // 5 satıra yayıyordu; uygulamanın her yerindeki düzen matris.
                      const gruplar = [];
                      girisler.forEach((g) => {
                        const anahtar = `${g.fisNo}|${g.siparisNo}|${g.urunAd}|${g.renk}|${g.tarih}`;
                        let gr = gruplar.find((x) => x.anahtar === anahtar);
                        if (!gr) { gr = { anahtar, ornek: g, hucreler: {}, toplam: 0 }; gruplar.push(gr); }
                        gr.hucreler[g.beden] = (gr.hucreler[g.beden] || 0) + g.miktar;
                        gr.toplam += g.miktar;
                      });
                      const bedenler = bedenSirala([...new Set(girisler.map((g) => g.beden))]);
                      const th = (metin, ek) => <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "3px 8px", textAlign: "left", borderBottom: "1px solid var(--erp-line-soft)", whiteSpace: "nowrap", ...(ek || {}) }}>{metin}</th>;
                      return (
                        <div style={{ overflowX: "auto" }}>
                          <table data-tedarik-matris="1" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse", background: "#fff" }}>
                            <thead>
                              <tr>
                                {th("Tarih")}{th("Kaynak")}{th("Fiş / Üretim")}{th("Ürün")}{th("Renk")}
                                {bedenler.map((b) => <React.Fragment key={b}>{th(b || "—", { textAlign: "center" })}</React.Fragment>)}
                                {th("Toplam", { textAlign: "right", borderLeft: "1px dashed var(--erp-line)" })}
                                <th style={{ borderBottom: "1px solid var(--erp-line-soft)" }} />
                              </tr>
                            </thead>
                            <tbody>
                              {gruplar.map((gr) => {
                                const g = gr.ornek;
                                return (
                                  <tr key={gr.anahtar} data-tedarik-giris={g.fisNo || g.siparisNo} onClick={() => git(g)} title={g.kaynak === "Üretim" ? "Üretim kartına git" : "Alış fişine git"}
                                    style={{ borderTop: "1px solid var(--erp-head)", cursor: "pointer" }}>
                                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}>{tarihYaz(g.tarih)}</td>
                                    <td style={{ fontSize: 11, padding: "4px 8px", fontWeight: 700, whiteSpace: "nowrap", color: g.kaynak === "Üretim" ? "var(--erp-primary)" : "var(--erp-brown)" }}>{g.kaynak === "Üretim" ? "Üretim" : "Alış Fişi"}</td>
                                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}>{g.fisNo || "—"}{g.siparisNo && g.siparisNo !== g.fisNo ? ` · ${g.siparisNo}` : ""}</td>
                                    <td style={{ fontSize: 11, padding: "4px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{g.urunAd}</td>
                                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}>{g.renk}</td>
                                    {bedenler.map((b) => (
                                      <td key={b} className="mono" style={{ fontSize: 12, padding: "4px 8px", textAlign: "center", color: gr.hucreler[b] ? "var(--erp-text)" : "var(--erp-border)" }}>
                                        {gr.hucreler[b] || "—"}
                                      </td>
                                    ))}
                                    <td className="mono" style={{ fontSize: 12, padding: "4px 8px", textAlign: "right", fontWeight: 700, borderLeft: "1px dashed var(--erp-line)", whiteSpace: "nowrap" }}>{gr.toplam} {g.birim}</td>
                                    <td style={{ padding: "4px 8px", color: "var(--erp-text-2)" }}><ArrowRight size={11} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                ));
              })()}
              {(siparis.durum === "Tamamlandı" || siparis.durum === "Kısmi Teslim")
                && !mobilBolumGizliMi(mobilBolumAyari, "fisGecmisi") && (() => {
                const cari = cariler.find((c) => c.id === siparis.cariId);
                // Gerçek benzersiz kimlik (siparisId) ile filtrelenir — sadece siparisNo (metin) kullanmak,
                // veritabanı sıfırlandıktan sonra sayaç yeniden başlayıp AYNI numara (örn. "ALS-1002") başka
                // bir siparişe de atandığında, o eski siparişin hareketlerinin buraya KARIŞMASINA yol açardı.
                const ilgiliHareketler = ((cari && cari.hareketler) || []).filter((h) =>
                  h.siparisId ? h.siparisId === siparis.id : h.siparisNo === siparis.siparisNo
                );
                if (ilgiliHareketler.length === 0) return null;

                const gruplar = [];
                const index = {};
                ilgiliHareketler.forEach((h) => {
                  const key = h.fisNo || h.id;
                  if (!(key in index)) {
                    index[key] = gruplar.length;
                    gruplar.push({ key, fisNo: h.fisNo, tarih: h.tarih, hareketler: [] });
                  }
                  gruplar[index[key]].hareketler.push(h);
                });
                gruplar.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

                const tipRenk = siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)";

                // Bu satılan (ürün+renk+beden) için kaynağı bulur. SADECE, bu satış siparişinin GERÇEK
                // kimliği (rezervasyonSiparisId) ile etiketlenmiş VE bu teslimattan ÖNCE (ya da aynı anda)
                // gerçekleşmiş bir stok girişi varsa "kesin" kaynak gösterilir — bu, Tedarik Planlama
                // üzerinden bu satışa özel oluşturulmuş bir Satınalma/Üretimden geldiği anlamına gelir.
                // ÖNEMLİ: Daha önce burada "en yakın tarihli genel giriş" TAHMİNİ yapılıyordu — bu YANLIŞTI,
                // çünkü ürün üretim/satın alma tamamlanmadan (stoğa hiç girmeden) MEVCUT stoktan teslim
                // edilmiş olabilir; o durumda ilgisiz bir önceki girişi "kaynak" gibi göstermek yanıltıcıydı.
                // Artık böyle bir kesin eşleşme yoksa dürüstçe "Stoktan teslim edildi" denir, VE eğer bu
                // kalem için hâlâ bekleyen bir Satınalma/Üretim planlaması varsa bu ayrıca uyarı olarak belirtilir.
                // ---- TEDARİK GİRİŞLERİ — bu siparişe bağlı stok girişleri (üretim + satın alma) ----
                //
                // Kullanıcı (13 Eylül, ekran görüntüsüyle): "100 çiftlik ürün satın alma ile girişi oldu,
                // burada yanlış gösteriyor." Aynı ürün/renk/bedende hem üretimden hem satın almadan
                // giriş varsa eski `kaynakBul` İLK eşleşeni (üretimi) bulup BÜTÜN satırlara yazıyordu;
                // 100 çiftlik alış "üretimden geldi" görünüyordu. Artık girişler tarih sırasıyla bir
                // havuzda, sevk satırları da tarih sırasıyla o havuzdan MİKTAR düşerek pay alıyor (FIFO):
                // bir satır iki kaynaktan da beslenebilir ("100 satın alma · 3 üretim").
                //
                // Girişin bu siparişe ait sayılması: `rezervasyonSiparisId` bu sipariş, ya da giriş
                // hareketinin `siparisNo`su kalemlerden birinin planlama referansı (üretim no / alış no).
                const tedarikGirisleri = siparisTedarikGirisleri(siparis, stok);

                // Sevk satırlarına FIFO pay: gruplar (fişler) zaten tarih sırasında; her satır kendi
                // ürün/renk/bedeninin girişlerinden, satış tarihinden ÖNCEKİLERDEN düşüyor.
                function kaynakBul(kalem, satisTarihiStr) {
                  const satisZaman = tarihUstSinir(satisTarihiStr);
                  const paylar = [];
                  let kalanMiktar = kalem.miktar || 0;
                  for (const g of tedarikGirisleri) {
                    if (kalanMiktar <= 0) break;
                    if (g.urunAd !== kalem.urunAd || g.renk !== (kalem.renk || "") || g.beden !== (kalem.beden || "")) continue;
                    if (g.kalan <= 0 || new Date(g.tarih).getTime() > satisZaman) continue;
                    const pay = Math.min(g.kalan, kalanMiktar);
                    g.kalan -= pay; kalanMiktar -= pay;
                    paylar.push({ giris: g, miktar: pay });
                  }
                  if (paylar.length > 0) return { tip: "kesin", paylar, stoktan: kalanMiktar > 0 ? kalanMiktar : 0 };

                  // Giriş yok — bu kalem için hâlâ bekleyen bir planlama var mı? Kalem TAM karşılandıysa
                  // gösterilmez (başka kaynaktan teslim edilmiş; unutulmuş referans yanıltır).
                  const orijinalKalem = (siparis.kalemler || []).find(
                    (k) => k.urunAd === kalem.urunAd && k.renk === kalem.renk && k.beden === kalem.beden
                  );
                  const kalemTamKarsilandi = orijinalKalem && (orijinalKalem.karsilanan || 0) >= orijinalKalem.miktar;
                  if (orijinalKalem && orijinalKalem.planlama && !kalemTamKarsilandi) {
                    return { tip: "bekleyenRezervasyon", planlamaTipi: orijinalKalem.planlama.tip, referansNo: orijinalKalem.planlama.referansNo };
                  }
                  return { tip: "stok" };
                }
                // Girişe git: alış fişi → Fişler, üretim → üretim kartı.
                function girisAc(g) {
                  if (g.kaynak === "Üretim") {
                    const u = (uretimSiparisleri || []).find((x) => x.id === g.uretimId || x.siparisNo === g.siparisNo);
                    if (u && onGoToUretim) return onGoToUretim(u.id);
                  }
                  if (g.fisNo && onFiseGitNo) return onFiseGitNo(g.fisNo);
                }
                function kaynakMetni(bulunan) {
                  if (!bulunan || bulunan.tip === "stok") return { metin: "Stoktan teslim edildi", renk: "var(--erp-text-3)" };
                  if (bulunan.tip === "bekleyenRezervasyon") {
                    const tip = bulunan.planlamaTipi === "Satınalma" ? "satın alma" : "üretim";
                    return {
                      metin: `⚠ Stoktan teslim edildi — bu kalem için ${tip} (${bulunan.referansNo}) hâlâ bekliyor`,
                      renk: "var(--erp-warn)",
                    };
                  }
                  // AYNI ÜRETİM/FİŞ TEK SATIR (kullanıcı, 19 Eylül: "tek üretimden 120 çift stoğa
                  // girdi ama sanki 2 üretimden girmiş gibi gösteriyor").
                  //
                  // Bir üretim parça parça teslim alınabiliyor (önce 10, sonra 5) ve her teslim
                  // ayrı bir stok hareketi. FIFO payları bu hareketleri ayrı ayrı gösterince aynı
                  // üretim numarası iki kez görünüyordu — okuyan kişi iki ayrı üretim sanıyor.
                  // Paylar artık kaynak + fiş/üretim numarasına göre TOPLANIYOR.
                  const birlesik = [];
                  bulunan.paylar.forEach((p) => {
                    // Anahtar YALNIZ kaynak + belge numarası: aynı üretimin iki teslim hareketinde
                    // `uretimId` birinde dolu birinde boş olabiliyor ve anahtara girince ayrı
                    // sayılıyorlardı — ekranda yine iki üretim görünüyordu (19 Eylül, ikinci bildirim).
                    const belge = p.giris.fisNo || p.giris.siparisNo || p.giris.uretimId || "";
                    const anahtar = `${p.giris.kaynak}|${belge}`;
                    const mevcut = birlesik.find((x) => x.anahtar === anahtar);
                    if (mevcut) { mevcut.miktar += p.miktar; return; }
                    birlesik.push({ anahtar, miktar: p.miktar, giris: p.giris });
                  });
                  const satirlar = birlesik.map((p) => ({
                    metin: p.giris.kaynak === "Satınalma"
                      ? `✓ ${p.miktar} alış fişiyle stoğa girdi (${p.giris.fisNo || p.giris.siparisNo || "—"})`
                      : `✓ ${p.miktar} üretimden depoya girdi (${p.giris.fisNo || p.giris.siparisNo || "—"})`,
                    renk: p.giris.kaynak === "Satınalma" ? "var(--erp-brown)" : "var(--erp-primary)",
                    giris: p.giris,
                  }));
                  if (bulunan.stoktan > 0) satirlar.push({ metin: `${bulunan.stoktan} stoktan teslim edildi`, renk: "var(--erp-text-3)" });
                  return { metin: satirlar.map((x) => x.metin).join(" · "), renk: satirlar[0].renk, satirlar };
                }

                return (
                  <div style={{ marginTop: 16 }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 12, fontWeight: 700, color: "var(--erp-panel-2)", marginBottom: 0,
                        display: "flex", alignItems: "center", gap: 6,
                        background: tipRenk, padding: "8px 12px", borderRadius: "8px 8px 0 0",
                      }}
                    >
                      {siparis.tip === "Alış" ? <PackageCheck size={13} /> : <Truck size={13} />}
                      {siparis.tip === "Alış" ? "Alış Fişi Geçmişi" : "Satış Fişi Geçmişi"} <span style={{ fontWeight: 400, opacity: 0.8 }}>({gruplar.length} fiş)</span>
                    </div>
                    <div style={{ border: `1.5px solid ${tipRenk}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden", background: "#fff" }}>
                      {gruplar.map((g, i) => {
                        // Muhasebe kaydı aynı fişte hem Genel hem Resmi olarak İKİ hareket üretir (aynı tutar) —
                        // görünen listede çift saymamak/göstermemek için sadece bir kez sayıyoruz.
                        const gorulmusImzalar = new Set();
                        const tekilHareketler = g.hareketler.filter((h) => {
                          const imza = `${h.tutar}|${h.urunAd || ""}|${h.renk || ""}|${h.beden || ""}|${h.miktar || ""}`;
                          if ((h.defter || "Genel") === "Resmi" && gorulmusImzalar.has(imza)) return false;
                          gorulmusImzalar.add(imza);
                          return true;
                        });
                        const toplamAdet = tekilHareketler.reduce((s, h) => s + (h.miktar || 0), 0);
                        const toplamTutar = tekilHareketler.reduce((s, h) => s + (h.tutar || 0), 0);
                        return (
                          <div
                            key={g.key}
                            style={{
                              padding: "9px 12px",
                              borderBottom: i === gruplar.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                              {/* FİŞ NUMARASI TIKLANABİLİR (kullanıcı, 10 Eylül: "kesilmiş fişin
                                  içine girsin; fiş ekranına tıklayınca fişe gitsin"). Düz metindi:
                                  kullanıcı fişin kesildiğini görüyor ama içine giremiyordu.
                                  Numarası olmayan satır düğme OLMUYOR — gidilecek bir yer yok. */}
                              {g.fisNo && onFiseGitNo ? (
                                <button
                                  type="button"
                                  className="mono"
                                  onClick={(e) => { e.stopPropagation(); onFiseGitNo(g.fisNo); }}
                                  title={`${g.fisNo} fişini Fişler ekranında aç`}
                                  style={{
                                    fontWeight: 700, fontSize: 12, background: "none", border: "none",
                                    padding: 0, cursor: "pointer", color: "var(--erp-info)", textDecoration: "underline",
                                  }}
                                >
                                  {g.fisNo}
                                </button>
                              ) : (
                                <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{g.fisNo || "—"}</span>
                              )}
                              <span aria-hidden="true" style={{ color: "var(--erp-border)" }}>·</span>
                              <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{tarihYaz(g.tarih, true)}</span>
                              <span aria-hidden="true" style={{ color: "var(--erp-border)" }}>·</span>
                              <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{toplamAdet} adet</span>
                              <button
                                type="button"
                                onClick={() => onPencereAc("fis", g.fisNo || g.key, `Fiş: ${g.fisNo || "—"}`, { fis: { ...g, hareketler: tekilHareketler }, siparis, cari, stok, firmaBilgileri })}
                                className="btn-ghost"
                                style={{ padding: "2px 8px", fontSize: 11 }}
                                title="Bu fişi müşteriye/tedarikçiye gönderilecek şekilde yazdır"
                              >
                                <Printer size={11} /> Yazdır / Paylaş
                              </button>
                              <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600 }}>
                                {toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                              </span>
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {urunRenkGrupla(tekilHareketler).map((ug) => {
                                const grupToplamAdet = ug.items.reduce((s, h) => s + (h.miktar || 0), 0);
                                const urun = (stok || []).find((p) => p.ad === ug.urunAd);
                                const resim = urun ? ((urun.renkResimleri || {})[ug.renk] || urun.kapakResmi) : null;
                                return (
                                  <div key={ug.key} style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                                      <ColorSwatch src={resim} editable={false} size={24} />
                                      <span style={{ fontWeight: 700, fontSize: 12 }}>
                                        {ug.urunAd} <span style={{ fontWeight: 400, color: "var(--erp-text-2)" }}>· {ug.renk}</span>
                                      </span>
                                      <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--erp-text-2)" }}>
                                        Toplam: <b>{grupToplamAdet}</b> {ug.birim}
                                      </span>
                                    </div>
                                    {/* MATRİS (kullanıcı, 13 Eylül: "burayı da matris yapalım; açıklamalar sığmaz,
                                        üretim/satın alma ikonu koyalım"). Sütun = beden, hücre = sevk miktarı;
                                        altında kaynak payları İKON olarak: çekiç = üretimden, paket = satın almadan,
                                        katman = stoktan. İkonun ipucu tam açıklama (kaç adet, hangi fiş), tıklayınca
                                        fiş/üretim açılır. "Sevk edildi" satırın tamamı için bir kez, altta. */}
                                    {(() => {
                                      const bedenler = bedenSirala([...new Set(ug.items.map((h) => h.beden || ""))]);
                                      const hucreler = {};
                                      ug.items.forEach((h) => {
                                        const kaynak = siparis.tip === "Satış" ? kaynakMetni(kaynakBul(h, h.tarih)) : null;
                                        const b = h.beden || "";
                                        hucreler[b] = hucreler[b] || { miktar: 0, kaynaklar: [] };
                                        hucreler[b].miktar += h.miktar || 0;
                                        if (kaynak) hucreler[b].kaynaklar.push(...(kaynak.satirlar || [kaynak]));
                                      });
                                      // HÜCREDE DE BİRLEŞTİR (19 Eylül, üçüncü bildirim: "tek üretimdi
                                      // ama 2 üretim girmiş gibi gösterdi").
                                      //
                                      // Birleştirme KALEM içinde yapılıyordu; ama aynı beden fişte iki
                                      // ayrı kalem olarak durabiliyor (farklı teslim partileri) ve her
                                      // kalemin kendi payı hücreye ayrı ayrı ekleniyordu. Aynı belgeden
                                      // gelen ikonlar burada da toplanıyor: bir üretim = bir ikon.
                                      Object.keys(hucreler).forEach((b) => {
                                        const toplanmis = [];
                                        hucreler[b].kaynaklar.forEach((ks) => {
                                          const belge = ks.giris ? `${ks.giris.kaynak}|${ks.giris.fisNo || ks.giris.siparisNo || ks.giris.uretimId || ""}` : "stok";
                                          const adet = parseInt((ks.metin.match(/(\d+)/) || [])[1] || "0", 10);
                                          const mevcut = toplanmis.find((x) => x.belge === belge);
                                          if (mevcut) {
                                            mevcut.adet += adet;
                                            mevcut.ks = { ...mevcut.ks, metin: mevcut.ks.metin.replace(/\d+/, String(mevcut.adet)) };
                                            return;
                                          }
                                          toplanmis.push({ belge, adet, ks });
                                        });
                                        hucreler[b].kaynaklar = toplanmis.map((x) => x.ks);
                                      });
                                      const KaynakIkonu = ({ ks }) => {
                                        const I = ks.giris ? (ks.giris.kaynak === "Üretim" ? Hammer : PackageCheck) : (/bekliyor/.test(ks.metin) ? AlertTriangle : Layers);
                                        const adet = (ks.metin.match(/^✓ (\d+)|^(\d+) stoktan/) || []).slice(1).find(Boolean) || "";
                                        return (
                                          <button type="button" data-kaynak-ikon={ks.giris ? ks.giris.kaynak : "stok"} title={ks.metin.replace(/^✓ /, "")}
                                            onClick={(e) => { e.stopPropagation(); if (ks.giris) girisAc(ks.giris); }}
                                            style={{ border: "none", background: "none", cursor: ks.giris ? "pointer" : "default", color: ks.renk, padding: 0, display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, fontWeight: 700 }}>
                                            <I size={10} />{adet}
                                          </button>
                                        );
                                      };
                                      return (
                                        <div style={{ overflowX: "auto" }}>
                                          <table data-sevk-matris={ug.key} style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                                            <thead>
                                              <tr>
                                                {bedenler.map((b) => <th key={b} className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 8px", textAlign: "center", borderBottom: "1px solid var(--erp-line-soft)" }}>{b || "—"}</th>)}
                                                <th className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 8px", textAlign: "right", borderBottom: "1px solid var(--erp-line-soft)", borderLeft: "1px dashed var(--erp-line)" }}>Toplam</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                {bedenler.map((b) => {
                                                  const h = hucreler[b];
                                                  return (
                                                    <td key={b} style={{ padding: "4px 8px", textAlign: "center", verticalAlign: "top" }}>
                                                      <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{h ? h.miktar : "—"}</div>
                                                      {h && h.kaynaklar.length > 0 && (
                                                        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", marginTop: 1 }}>
                                                          {h.kaynaklar.map((ks, i) => <KaynakIkonu key={i} ks={ks} />)}
                                                        </div>
                                                      )}
                                                    </td>
                                                  );
                                                })}
                                                <td className="mono" style={{ padding: "4px 8px", textAlign: "right", fontSize: 12, fontWeight: 700, borderLeft: "1px dashed var(--erp-line)", verticalAlign: "top" }}>{grupToplamAdet} {ug.birim}</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                          {siparis.tip === "Satış" && (
                                            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-info)", marginTop: 3, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                              <span>✓ Sevk edildi ({g.fisNo || "—"}{g.tarih ? ` · ${tarihYaz(g.tarih)}` : ""})</span>
                                              <span style={{ color: "var(--erp-text-3)", fontWeight: 400, display: "inline-flex", gap: 8 }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Hammer size={9} /> üretimden</span>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><PackageCheck size={9} /> alış fişinden</span>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Layers size={9} /> stoktan</span>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
                  </>
                )}

                {aktifKey === "rezervasyon" && (
          // REZERVASYON SEKMESİ: sipariş numaraları TIKLANABİLİRDİR — ilgili siparişe atlanır.
          // İki yön de burada ele alınır: bir ALIŞ açıldığında hangi satışlara rezerve olduğu;
          // bir SATIŞ açıldığında onun için hangi hammadde alışlarının açıldığı ve ne kadarının
          // hâlâ yolda olduğu.
          // DİKKAT: burası `&& (` içindeki bir JS İFADE konumu — JSX yorumu burada boş bir nesne
          // olarak ayrıştırılır ve ardından gelen ifadeyi bozar ("{} is not a function").
          (() => {
            const alisRez = siparis.tip === "Alış" ? alisRezervasyonOzeti(siparis, tumSiparisler) : [];
            const hamAlislar = siparis.tip === "Satış" ? satisIcinHammaddeAlislari(siparis.id, tumSiparisler) : [];
            if (alisRez.length === 0 && hamAlislar.length === 0) return null;

            return (
              <div style={{ marginBottom: 10, padding: 12, background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)" }}>
                {/* Başlık, sekme adında zaten var; burada yalnızca AÇIKLAMA satırı kalır — ne
                    anlama geldiğini ilk kez gören kullanıcı için. */}
                <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.6 }}>
                  {siparis.tip === "Alış"
                    ? "Bu alış siparişi Planlama > Sipariş İhtiyaç Planlama ekranından açıldı ve aşağıdaki satış siparişlerine rezerve edildi."
                    : "Bu siparişin hammadde ihtiyacı için açılmış alış siparişleri. Numaraya tıklayarak alışa gidebilirsiniz."}
                </div>

                {alisRez.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {alisRez.map((r) => (
                      <button
                        key={r.siparisId}
                        type="button"
                        disabled={r.kaynakSilinmis}
                        onClick={() => !r.kaynakSilinmis && onSiparisGit && onSiparisGit(r.siparisId)}
                        className="mono"
                        title={r.kaynakSilinmis ? "Kaynak satış siparişi silinmiş — rezervasyon kaydı bilgi amaçlı duruyor" : "Satış siparişine git"}
                        style={{
                          display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                          padding: "4px 9px", borderRadius: "var(--erp-r-md)",
                          border: `1px solid ${r.kaynakSilinmis ? "var(--erp-border)" : "#C99A9A"}`,
                          background: r.kaynakSilinmis ? "var(--erp-panel-2)" : "#9C3D3D12",
                          color: r.kaynakSilinmis ? "var(--erp-text-3)" : "#9C3D3D",
                          cursor: r.kaynakSilinmis ? "default" : "pointer",
                        }}
                      >
                        {!r.kaynakSilinmis && <ArrowRight size={11} />}
                        {r.siparisNo}
                        <span style={{ fontWeight: 500 }}>· {r.miktar}{r.birim ? " " + r.birim : ""}</span>
                        {r.kaynakSilinmis && <span style={{ fontWeight: 500 }}>(silinmiş)</span>}
                      </button>
                    ))}
                  </div>
                )}

                {hamAlislar.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {hamAlislar.map((a) => {
                      const tedarikci = cariler.find((c) => c.id === a.cariId);
                      return (
                        <div key={a.alisSiparisId} style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => onSiparisGit && onSiparisGit(a.alisSiparisId)}
                            className="mono"
                            title="Alış siparişine git"
                            style={{
                              display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                              padding: "4px 9px", borderRadius: "var(--erp-r-md)", border: "1px solid #A9BECC",
                              background: "#3D6B8A12", color: "var(--erp-info)", cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            <ArrowRight size={11} /> {a.alisSiparisNo}
                          </button>
                          <span style={{ fontSize: 11, color: "var(--erp-text-2)", paddingTop: 4 }}>
                            {tedarikci ? tedarikci.unvan : "—"} · {a.durum}
                            {a.yolda > 0
                              ? <> · <span className="mono" style={{ color: "var(--erp-info)", fontWeight: 700 }}>yolda {a.yolda}</span></>
                              : <> · <span className="mono" style={{ color: "var(--erp-primary)", fontWeight: 700 }}>tamamı teslim alındı</span></>}
                            {/* REZERVASYON DURUMU — teslimattan sonraki hayat. "yolda" malın gelip
                                gelmediğini, bu ise gelen malın KULLANILIP kullanılmadığını söyler.
                                Kalan sıfırlanınca rezervasyon kapanmıştır. */}
                            {a.kapandiMi
                              ? <> · <span className="mono" style={{ color: "var(--erp-primary)", fontWeight: 700 }}>✓ rezervasyon kapandı</span></>
                              : a.tuketilen > 0
                                ? <> · <span className="mono" style={{ color: "var(--erp-brown)", fontWeight: 700 }}>{a.tuketilen}/{a.pay} tüketildi · {a.kalan} rezerve</span></>
                                : <> · <span className="mono" style={{ color: "var(--erp-brown)", fontWeight: 700 }}>{a.pay} rezerve, henüz kullanılmadı</span></>}
                          </span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 3 }}>
                            {a.kalemler.map((k, i) => (
                              <span key={i} className="mono" style={{ fontSize: 9, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-panel-2)", color: "var(--erp-text)" }}>
                                {/* matris-muaf: rezervasyon payı dökümü, satır sayısı bir avuç. */}
                                {k.urunAd} · {k.renk} · {k.beden}: {k.pay}{k.birim ? " " + k.birim : ""}
                                {k.payTeslim > 0 && k.payTeslim < k.pay ? ` (${k.payTeslim} geldi)` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
                )}
              </div>
            );
          })()}



          {/* Teslim alma da bir DEĞİŞİKLİK işlemidir (stok ve cari hareketi yaratır) — önizlemede gizli. */}
          {/* SİPARİŞİN KOLİLERİ (23 Eylül, v1.423.0 — kullanıcı: "siparişe bağlı kolilerin de siparişte
              bilinmesi gerekli, sipariş raporunda kullanabiliriz"). TÜRETİLİYOR, ayrı kayıt yok: koli
              kendi siparişinden, yoksa üretimi üzerinden bu siparişe çözülüyorsa (237-koli-fis) burada.
              Sevk edilenler hangi fişle çıktığını gösterir. */}
          {siparis.tip !== "Alış" && (() => {
            const sk = (koliler || []).filter((kl) => (koliSiparisiniCoz(kl, tumSiparisler, uretimSiparisleri).siparis || {}).id === siparis.id);
            if (!sk.length) return null;
            const cift = (kl) => (kl.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0);
            const hazir = sk.filter((kl) => (kl.durum || "Hazır") === "Hazır");
            const sevk = sk.filter((kl) => kl.durum === "Sevk edildi");
            return (
              <div data-siparis-kolileri={siparis.siparisNo} style={{ marginBottom: 10, fontSize: 12, border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <b>Koliler</b>
                  <span className="mono">{sk.length} koli · {sk.reduce((t, kl) => t + cift(kl), 0)} çift</span>
                  <span className="mono" style={{ color: "var(--erp-warn)" }}>hazır {hazir.length} ({hazir.reduce((t, kl) => t + cift(kl), 0)} çift)</span>
                  <span className="mono" style={{ color: "var(--erp-ok, #4A6B3E)" }}>sevk {sevk.length} ({sevk.reduce((t, kl) => t + cift(kl), 0)} çift)</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {sk.map((kl) => (
                    <span key={kl.id} data-siparis-koli={kl.kod} title={kl.elleKapatildi ? `Elle kapatıldı: ${kl.elleKapatildi.sebep}` : undefined}
                      style={{ padding: "2px 6px", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)",
                        background: kl.durum === "Sevk edildi" ? "#EEF3EA" : "var(--erp-hover)" }}>
                      <b className="mono">{kl.kod}</b> · {cift(kl)} çift · {kl.durum === "Sevk edildi"
                        ? (kl.sevkFisNo ? `sevk ${kl.sevkFisNo}` : "elle kapatıldı")
                        : "hazır"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {!saltOkunur && eksikVar && siparis.durum !== "İptal" && (
            <div style={{ marginTop: 16 }}>
              {/* DÜĞME FİŞİN ÜSTÜNDE, HER ZAMAN GÖRÜNÜR. Eskiden düğme ile fiş birbirinin yerine
                  geçiyordu: fiş açılınca düğme kayboluyor, kullanıcı fişi kapatmak için "Vazgeç"i
                  bulmak zorunda kalıyordu. Şimdi düğme yerinde duruyor ve fiş onun ALTINDA açılıyor. */}
              {/* HAZIR ÜRÜNLER MATRİSİ (12 Eylül) ARTIK FORMUN DIŞINDA (23 Eylül, v1.422.0): satış
                  formu tek ekrana taşındı, bilgi bloğu kartta kaldı. Fiş açılırken satırlar zaten hazır
                  miktarla yükleniyor; burası "ne kadar hazır, ne kadar stokta" sorusunun cevabı. */}
                    {siparis.tip !== "Alış" && (() => {
                      const hazirlar = siparisHazirKalemleri(siparis, tumSiparisler, uretimSiparisleri, stok);
                      if (hazirlar.length === 0) return (
                        <div data-hazir-urunler="bos" style={{ fontSize: 11, color: "var(--erp-text-3)", marginBottom: 10 }}>
                          Bu siparişte henüz hazır (üretilmiş / teslim alınmış) ürün yok.
                        </div>
                      );
                      const toplam = Math.round(hazirlar.reduce((t, h) => t + h.hazir, 0) * 100) / 100;
                      // MATRİS DÜZENİ (kullanıcı, 12 Eylül: "matris düzeninde yap"): satır = model+renk,
                      // sütun = beden — sipariş girişi ve fişin kendi tablosuyla aynı biçim. Her
                      // bedeni ayrı satırda listelemek 8 bedenli bir modeli 8 satıra yayıyordu.
                      const gruplar = [];
                      hazirlar.forEach((h) => {
                        const anahtar = `${h.urunId}|${h.renk}`;
                        let g = gruplar.find((x) => x.anahtar === anahtar);
                        if (!g) { g = { anahtar, urunAd: h.urunAd, renk: h.renk, hucreler: {}, kaynaklar: [], toplam: 0 }; gruplar.push(g); }
                        g.hucreler[h.beden] = h;
                        if (h.kaynak && !g.kaynaklar.includes(h.kaynak)) g.kaynaklar.push(h.kaynak);
                        g.toplam = Math.round((g.toplam + h.hazir) * 100) / 100;
                      });
                      const bedenler = bedenSirala([...new Set(hazirlar.map((h) => h.beden))]);
                      const hucreStil = { fontSize: 11, padding: "3px 6px", textAlign: "center", whiteSpace: "nowrap" };
                      return (
                        <div data-hazir-urunler="1" style={{ background: "#fff", border: "1px solid #7FA3BE", borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <PackageCheck size={13} color="var(--erp-info)" />
                            <b style={{ fontSize: 12, color: "var(--erp-info)" }}>Hazır ürünler</b>
                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{toplam} {hazirlar[0] && (siparis.kalemler.find((k) => k.id === hazirlar[0].kalemId) || {}).birim}</span>
                            <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>hücrede hazır / stokta</span>
                            {/* SATIŞTA GİZLİ (23 Eylül, v1.425.0): "Satış Fişi Oluştur" artık kartın içindeki
                                inline formu değil harici satış fişini açıyor (kalemsiz); bu düğme
                                `teslimMiktarlar`ı doldururdu ama satışta o state'i okuyan bir form
                                artık yok — tıklansa hiçbir yere yansımazdı. Alışta form hâlâ burada. */}
                            {siparis.tip === "Alış" && (
                              <button className="btn-ghost" data-hazirlari-doldur="1" style={{ marginLeft: "auto", padding: "3px 8px", fontSize: 11 }} onClick={() => hazirlariDoldur()}>
                                Hazır olanların tümünü fişe koy
                              </button>
                            )}
                          </div>
                          <div style={{ overflowX: "auto" }}>
                            <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Ürün</th>
                                  <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Renk</th>
                                  <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Kaynak</th>
                                  {bedenler.map((b) => <th key={b} className="mono" style={{ ...hucreStil, fontSize: 10, color: "var(--erp-text-2)" }}>{b || "—"}</th>)}
                                  <th style={{ ...hucreStil, fontSize: 10, color: "var(--erp-text-2)", borderLeft: "1px dashed var(--erp-line)" }}>Toplam</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {gruplar.map((g) => (
                                  <tr key={g.anahtar} data-hazir-satir={g.anahtar} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                                    <td style={{ fontSize: 12, padding: "3px 6px", fontWeight: 600 }}>{g.urunAd}</td>
                                    <td className="mono" style={{ fontSize: 11, padding: "3px 6px" }}>{g.renk}</td>
                                    <td style={{ fontSize: 11, padding: "3px 6px", color: "var(--erp-text-2)" }}>{g.kaynaklar.join(" / ")}</td>
                                    {bedenler.map((b) => {
                                      const h = g.hucreler[b];
                                      if (!h) return <td key={b} className="mono" style={{ ...hucreStil, color: "var(--erp-border)" }}>—</td>;
                                      const eksik = h.stokta < h.hazir;
                                      return (
                                        <td key={b} className="mono" style={hucreStil}
                                          title={eksik ? "Depodaki miktar hazır sayısından az — üretim stoğa girmemiş ya da mal başka yere verilmiş olabilir" : `hazır ${h.hazir} · stokta ${h.stokta}`}>
                                          <b style={{ color: "var(--erp-info)", fontSize: 12 }}>{h.hazir}</b>
                                          <span style={{ color: eksik ? "var(--erp-warn)" : "var(--erp-text-3)", fontSize: 10 }}> / {eksik ? "⚠ " : ""}{h.stokta}</span>
                                        </td>
                                      );
                                    })}
                                    <td className="mono" style={{ ...hucreStil, fontWeight: 700, color: "var(--erp-info)", borderLeft: "1px dashed var(--erp-line)" }}>{g.toplam}</td>
                                    <td style={{ padding: "3px 6px", textAlign: "right" }}>
                                      <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => hazirlariDoldur(g.anahtar)}>
                                        <Plus size={10} /> Fişe koy
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
              <button
                          data-fis-olustur="1"
                className={showTeslim ? "btn-ghost" : "btn-primary"}
                onClick={() => {
                  // SATIŞ TEK EKRAN (23 Eylül, v1.422.0 — kullanıcı: "satış ekranı tek olsun; depodan da,
                  // siparişten de, cariden de satış deyince aynı ekran açılsın; farklı yerler yalnız
                  // köprü olsun, hatayı tek yerde arayalım"). Satış siparişi artık kartın içindeki
                  // formu değil, cari satış fişini (255) açıyor: kalan kalemler siparişe bağlı yüklü,
                  // koli okutma / siparişten seç / peşin / defter hepsi orada.
                  // ALIŞ DA TEK EKRANDA (23 Eylül, v1.431.0 — kullanıcı 1. seçeneği seçti):
                  // onay penceresi ortak fiş ekranına taşındığı için alış artık kartın içindeki
                  // formu değil cari ALIŞ fişini açıyor. Stok etkisi özeti ve veri hatası bariyeri
                  // orada; üstelik satışta da çalışıyor.
                  // SADECE FİŞİ AÇ (23 Eylül, v1.425.0 — kullanıcı: "siparişten satış fişi
                  // oluştururken satış fişini açsın sadece, geri davranış standart olacak zaten").
                  // v1.422-424 buton hazır miktar ve koliyi ÖNCEDEN hesaplayıp fişe dolduruyordu;
                  // kullanıcı bunu fazla buldu. Fişin kendi araçları (Siparişten seç, Koli okut)
                  // zaten standart yol — kullanıcı orada ne ekleneceğini kendi seçiyor.
                  if (onSatisFisiAc) {
                    onSatisFisiAc(siparis, []);
                    return;
                  }
                  if (showTeslim) { setShowTeslim(false); return; }
                  setTeslimDefter(siparis.defterTercihi || "Genel");
                  setShowTeslim(true);
                }}
              >
                <PackageCheck size={14} />
                {showTeslim
                  ? (siparis.tip === "Alış" ? "Alış Fişini Kapat" : "Satış Fişini Kapat")
                  : (siparis.tip === "Alış" ? "Alış Fişi Oluştur" : "Satış Fişi Oluştur")}
              </button>
              {showTeslim && (
                <div>
                  <StitchDivider color={siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)"} />
                  <div
                    style={{
                      background: siparis.tip === "Alış" ? "var(--erp-hover)" : "#EAF0F4",
                      border: `1.5px solid ${siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)"}`,
                      borderRadius: "var(--erp-r-md)", padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                      <div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 12, fontWeight: 700,
                            color: siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)",
                            display: "flex", alignItems: "center", gap: 6,
                          }}
                        >
                          {siparis.tip === "Alış" ? <PackageCheck size={14} /> : <Truck size={14} />}
                          {siparis.tip === "Alış" ? "Alış Fişi" : "Stok Çıkışı (Satış)"} — {siparis.siparisNo}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 2 }}>
                          {siparis.tip === "Alış"
                            ? <>Yeni bir sipariş oluşturmuyorsunuz — bu, <b>{siparis.siparisNo}</b> siparişine ait bir Alış Fişi kesme adımıdır.</>
                            : <>Yeni bir sipariş oluşturmuyorsunuz — bu, <b>{siparis.siparisNo}</b> siparişinin kalemlerini karşılama adımıdır.</>}
                        </div>
                      </div>
                      <button className="btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }} onClick={tumunuDoldur}>
                        Kalanların tümünü doldur
                      </button>
                    </div>
                    {/* HAZIR ÜRÜNLER — üretilmiş ya da tedarik edilmiş, henüz teslim edilmemiş
                        (kullanıcı, 12 Eylül). Yalnız SATIŞ tarafında: alışta "hazır" kavramı yok. */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                        Cari hareketi hangi deftere işlensin?
                      </span>
                      <select value={teslimDefter} onChange={(e) => setTeslimDefter(e.target.value)} style={{ ...inputStyle, width: 170, padding: "5px 7px", fontSize: 12 }}>
                        <option value="Genel">Genel</option>
                        <option value="Resmi">Resmi</option>
                        <option value="Muhasebe">Muhasebe (ikisine de)</option>
                      </select>
                      {!cari && (
                        <span style={{ fontSize: 10, color: "var(--erp-warn)" }} title="Bu siparişte tanınan bir cari bulunamadı, bu seçim sadece bir cari eşleşirse etkili olur">
                          ⚠ cari eşleşmedi
                        </span>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                    {(() => {
                      const bekleyenler = tumTeslimKalemleri.filter((k) => (k.karsilanan || 0) < k.miktar);
                      if (bekleyenler.length === 0) {
                        return (
                          <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                            Bu siparişte bekleyen kalem kalmadı.
                          </div>
                        );
                      }

                      // ---- ÜST SEÇİM: MODEL + RENK ----
                      // Beden seçilmiyor. Bir renk eklendiğinde o rengin BÜTÜN bedenleri satırın
                      // içinde listeleniyor ve siparişteki kalanla dolu geliyor.
                      const urunler = [];
                      bekleyenler.forEach((k) => {
                        if (!urunler.some((u) => u.id === k.urunId)) urunler.push({ id: k.urunId, ad: k.urunAd });
                      });
                      // Seçim boşsa ilk seçeneğe düşülür. State'i useEffect ile doldurmak yerine
                      // burada çözmek, kalemler değişince bayat seçim kalmasını da engelliyor.
                      const uId = urunler.some((u) => u.id === cikisUrunId) ? cikisUrunId : urunler[0].id;
                      const renkler = Array.from(new Set(bekleyenler.filter((k) => k.urunId === uId).map((k) => k.renk)));
                      const renk = renkler.includes(cikisRenk) ? cikisRenk : renkler[0];

                      const kalanMiktar = (k) => k.miktar - (k.karsilanan || 0);
                      const eldeMiktar = (k) => {
                        const urun = (stok || []).find((p) => p.id === k.urunId);
                        const v = urun ? urun.variants.find((x) => x.renk === k.renk && x.beden === k.beden) : null;
                        return v ? v.miktar : 0;
                      };
                      const grupKalemleri = (anahtar) => {
                        const [gUrunId, gRenk] = anahtar.split("|");
                        return bekleyenler.filter((k) => k.urunId === gUrunId && k.renk === gRenk);
                      };

                      // Siparişte bekleyen bütün model+renk kombinasyonları (seçim sırası da bu).
                      const tumKombinasyonlar = [];
                      bekleyenler.forEach((k) => {
                        const anahtar = `${k.urunId}|${k.renk}`;
                        if (!tumKombinasyonlar.some((x) => x.anahtar === anahtar)) {
                          tumKombinasyonlar.push({ anahtar, urunId: k.urunId, renk: k.renk, urunAd: k.urunAd });
                        }
                      });
                      const eklenmemisSayisi = tumKombinasyonlar.filter((x) => !eklenenGruplar.includes(x.anahtar)).length;
                      const renginBedenleri = bekleyenler.filter((k) => k.urunId === uId && k.renk === renk).map((k) => k.beden);
                      const buSatirEkliMi = eklenenGruplar.includes(`${uId}|${renk}`);

                      // ONAY PANELİ AÇIKKEN DÜZENLEME YAPILIRSA ONAY KAPANIR.
                      // Panel "şu ürünlerin stoğu şöyle değişecek" diye bir ÖZET gösteriyor; satır
                      // eklenince o özet bayatlıyor ama ekranda duruyordu. Kullanıcı hem eski özeti
                      // görüp hem yeni satırı ekleyince "acaba hangisi kaydedilecek" diye takılıyor,
                      // üstelik ekranın altındaki onay düğmesi görsel olarak "iş bitti" diyordu.
                      // Düzenlemeye dönmek artık kendiliğinden oluyor.
                      const onayiKapat = () => setTeslimOnayGoster(false);

                      // KOLİ OKUTMA. Koli içindeki her kalem, siparişin BEKLEYEN kalemleriyle
                      // eşleştirilip miktar kutularına ekleniyor. Eşleşmeyen kalem sessizce
                      // yutulmuyor: hangi ürünün eşleşmediği kullanıcıya söyleniyor — koli yanlış
                      // siparişe okutulduğunda bunu ancak böyle fark eder.
                      const koliUyar = (m) => setKoliMesaji(m);
                      const koliOkut = (kod) => {
                        const temiz = String(kod || "").trim();
                        if (!temiz) return;
                        const koli = (koliler || []).find((k) => k.kod === temiz || k.id === temiz);
                        if (!koli) { koliUyar(`Koli bulunamadı: ${temiz}`); return; }
                        if (okutulanKoliler.includes(koli.id)) { koliUyar(`${koli.kod} zaten okutuldu`); return; }
                        if ((koli.durum || "Hazır") !== "Hazır") {
                          koliUyar(`${koli.kod} zaten sevk edilmiş (${koli.sevkFisNo || "fiş"})`);
                          return;
                        }
                        const eslesmeyen = [];
                        const eklenecek = {};
                        const gruplar = [];
                        (koli.kalemler || []).forEach((kk) => {
                          const kalem = bekleyenler.find((b) => b.urunId === kk.urunId && b.renk === kk.renk && b.beden === kk.beden);
                          if (!kalem) { eslesmeyen.push(`${kk.urunAd} ${kk.renk} ${kk.beden}`); return; }
                          eklenecek[kalem.id] = (eklenecek[kalem.id] || 0) + kk.adet;
                          const a = `${kalem.urunId}|${kalem.renk}`;
                          if (!gruplar.includes(a)) gruplar.push(a);
                        });
                        if (Object.keys(eklenecek).length === 0) {
                          koliUyar(`${koli.kod} içindeki hiçbir kalem bu siparişte bekliyor değil`);
                          return;
                        }
                        onayiKapat();
                        setTeslimMiktarlar((onceki) => {
                          const next = { ...onceki };
                          Object.entries(eklenecek).forEach(([kalemId, adet]) => {
                            next[kalemId] = String((parseFloat(next[kalemId]) || 0) + adet);
                          });
                          return next;
                        });
                        setEklenenGruplar((onceki) => [...onceki, ...gruplar.filter((g) => !onceki.includes(g))]);
                        setOkutulanKoliler((onceki) => [...onceki, koli.id]);
                        setBarkodGirisi("");
                        koliUyar(eslesmeyen.length
                          ? `${koli.kod} eklendi — ${eslesmeyen.length} kalem bu siparişte yok: ${eslesmeyen.join(", ")}`
                          : `${koli.kod} eklendi`);
                      };

                      // Koli çıkarılınca eklediği miktarlar da geri alınıyor: yalnızca rozeti
                      // silmek, miktarları koli okutulmuş gibi bırakır ve fiş fazla çıkardı.
                      const koliCikar = (koliId) => {
                        const koli = (koliler || []).find((k) => k.id === koliId);
                        setOkutulanKoliler((onceki) => onceki.filter((x) => x !== koliId));
                        if (!koli) return;
                        onayiKapat();
                        setTeslimMiktarlar((onceki) => {
                          const next = { ...onceki };
                          (koli.kalemler || []).forEach((kk) => {
                            const kalem = bekleyenler.find((b) => b.urunId === kk.urunId && b.renk === kk.renk && b.beden === kk.beden);
                            if (!kalem) return;
                            const kalan = (parseFloat(next[kalem.id]) || 0) - kk.adet;
                            if (kalan > 0) next[kalem.id] = String(kalan);
                            else delete next[kalem.id];
                          });
                          return next;
                        });
                      };

                      const grupEkle = () => {
                        onayiKapat();
                        const anahtar = `${uId}|${renk}`;
                        // SATIR DOLU GELİR: kalan miktarlar yazılır. En sık yapılan iş "kalanı çık";
                        // boş bir matris koyup her bedeni elle doldurtmak o işi uzatıyordu.
                        // Zaten eklenmiş bir satır tekrar eklenirse miktarlar EZİLMEZ.
                        setTeslimMiktarlar((onceki) => {
                          const next = { ...onceki };
                          grupKalemleri(anahtar).forEach((k) => {
                            if (next[k.id] === undefined) next[k.id] = String(kalanMiktar(k));
                          });
                          return next;
                        });
                        setEklenenGruplar((onceki) => (onceki.includes(anahtar) ? onceki : [...onceki, anahtar]));

                        // SEÇİM KENDİLİĞİNDEN SONRAKİNE GEÇER.
                        // Eklenen model/renk seçili kalınca düğmeye ikinci kez basmak HİÇBİR ŞEY
                        // yapmıyordu (o satır zaten ekli) ve kullanıcı "sadece tek satır
                        // ekleyebiliyorum" sonucuna varıyordu. Ekledikten sonra seçim, henüz
                        // eklenmemiş ilk kombinasyona kayıyor; arka arkaya basmak işe yarıyor.
                        const kalanlar = tumKombinasyonlar.filter((x) => x.anahtar !== anahtar && !eklenenGruplar.includes(x.anahtar));
                        if (kalanlar.length > 0) {
                          setCikisUrunId(kalanlar[0].urunId);
                          setCikisRenk(kalanlar[0].renk);
                        }
                      };

                      const grupCikar = (anahtar) => {
                        onayiKapat();
                        setTeslimMiktarlar((onceki) => {
                          const next = { ...onceki };
                          grupKalemleri(anahtar).forEach((k) => { delete next[k.id]; });
                          return next;
                        });
                        setEklenenGruplar((onceki) => onceki.filter((x) => x !== anahtar));
                      };

                      // Ekranda duran satırlar: yalnızca hâlâ bekleyen kalemi olanlar.
                      const gecerliGruplar = eklenenGruplar.filter((a) => grupKalemleri(a).length > 0);

                      return (
                        <>
                          {/* KOLİ BARKODU OKUTMA — sevkiyatın asıl yolu.
                              Koli barkodu okutulunca içindeki kalemler miktar kutularına dağılıyor;
                              elle beden beden girmeye gerek kalmıyor. Barkodun kendisi veri
                              taşımıyor, yalnızca koli kodunu; içerik kayıttan açılıyor. */}
                          {siparis.tip === "Satış" && (
                            <div style={{ border: "1.5px solid #3D6B8A", borderRadius: "var(--erp-r-md)", padding: 10, background: "#EAF0F4", display: "grid", gap: 8 }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                                <label style={{ display: "grid", gap: 3, flex: 1, minWidth: 200 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2E5670" }}>Koli barkodu okut</span>
                                  <input
                                    value={barkodGirisi}
                                    onChange={(e) => setBarkodGirisi(e.target.value)}
                                    onKeyDown={(e) => {
                                      // Barkod okuyucular okumayı Enter ile bitirir; elle yazan için
                                      // yandaki düğme var. İkisi de aynı işi çağırıyor.
                                      if (e.key !== "Enter") return;
                                      e.preventDefault();
                                      koliOkut(barkodGirisi);
                                    }}
                                    placeholder="Barkodu okutun ya da kodu yazıp Enter"
                                    title="Koli barkodu"
                                    style={{ ...inputStyle, fontFamily: "monospace" }}
                                  />
                                </label>
                                <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => koliOkut(barkodGirisi)}>
                                  <PackageCheck size={13} /> Koliyi Ekle
                                </button>
                              </div>
                              {koliMesaji && (
                                <div style={{ fontSize: 11, color: "#2E5670", background: "#fff", border: "1px solid #3D6B8A", borderRadius: "var(--erp-r-sm)", padding: "5px 8px" }}>
                                  {koliMesaji}
                                </div>
                              )}
                              {okutulanKoliler.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {okutulanKoliler.map((kid) => {
                                    const k = (koliler || []).find((x) => x.id === kid);
                                    return (
                                      <span key={kid} className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#2E5670", background: "#fff", border: "1px solid #3D6B8A", borderRadius: "var(--erp-r-pill)", padding: "2px 9px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        {k ? k.kod : kid}
                                        <button type="button" className="btn-ikon" title="Bu koliyi çıkar" onClick={() => koliCikar(kid)}>
                                          <X size={11} />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <label style={{ display: "grid", gap: 3 }}>
                              <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Model</span>
                              <select
                                value={uId}
                                onChange={(e) => { setCikisUrunId(e.target.value); setCikisRenk(""); }}
                                style={{ ...inputStyle, width: 190, padding: "5px 7px", fontSize: 12 }}
                              >
                                {urunler.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
                              </select>
                            </label>
                            <label style={{ display: "grid", gap: 3 }}>
                              <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Renk</span>
                              <select
                                value={renk}
                                onChange={(e) => setCikisRenk(e.target.value)}
                                style={{ ...inputStyle, width: 150, padding: "5px 7px", fontSize: 12 }}
                              >
                                {renkler.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </label>
                            <button
                              type="button"
                              className={buSatirEkliMi ? "btn-ghost" : "btn-primary"}
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              data-grup-ekle="1"
                              onClick={grupEkle}
                              disabled={buSatirEkliMi}
                              title={buSatirEkliMi
                                ? "Bu model/renk zaten eklendi — listeden başka bir model ya da renk seçin"
                                : "Bu rengin bütün bedenleri, siparişteki kalan miktarlarla aşağı eklenir"}
                            >
                              <Plus size={13} /> {buSatirEkliMi ? "Zaten eklendi" : "Kalem Ekle"}
                            </button>
                            {/* SİPARİŞTEN SEÇ (9b): aynı tedarikçinin diğer açık alış siparişlerinin
                                kalemlerini bu fişe al. Yalnız ALIŞ; satışta koli okutma var. */}
                            {siparis.tip === "Alış" && (() => {
                              const digerler = (tumSiparisler || []).filter((s) => s.id !== siparis.id && s.tip === "Alış" && s.cariId === siparis.cariId
                                && s.durum !== "İptal" && (s.kalemler || []).some((k) => (k.karsilanan || 0) < k.miktar && !ekKalemler.some((e) => e.id === k.id)));
                              if (digerler.length === 0 && !siparistenSecAcik) return null;
                              return (
                                <div style={{ flexBasis: "100%", display: "grid", gap: 6 }}>
                                  <button type="button" className="btn-ghost" data-siparisten-sec="1" style={{ justifySelf: "start", padding: "4px 10px", fontSize: 11 }}
                                    onClick={() => setSiparistenSecAcik(!siparistenSecAcik)}
                                    title="Aynı tedarikçinin diğer açık alış siparişlerinden bu fişe kalem al — hepsi tek fişte, her siparişin teslim alınanı kendi kaydında güncellenir">
                                    <ClipboardList size={12} /> Siparişten seç ({digerler.length} açık alış siparişi)
                                  </button>
                                  {siparistenSecAcik && digerler.map((s) => {
                                    const bekleyen = (s.kalemler || []).filter((k) => (k.karsilanan || 0) < k.miktar && !ekKalemler.some((e) => e.id === k.id));
                                    const bedenler = bedenSirala([...new Set(bekleyen.map((k) => k.beden || ""))]);
                                    const satirlar = [];
                                    bekleyen.forEach((k) => {
                                      const a = `${k.urunId}|${k.renk || ""}`;
                                      let r = satirlar.find((x) => x.a === a);
                                      if (!r) { r = { a, urunAd: k.urunAd, renk: k.renk || "", hucre: {} }; satirlar.push(r); }
                                      r.hucre[k.beden || ""] = (r.hucre[k.beden || ""] || 0) + (k.miktar - (k.karsilanan || 0));
                                    });
                                    return (
                                      <div key={s.id} data-siparisten-sec-siparis={s.siparisNo} style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 8, background: "#fff" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                          <b className="mono" style={{ fontSize: 12 }}>{s.siparisNo}</b>
                                          <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{tarihYaz(s.tarih)} · {s.durum} · kalan {bekleyen.reduce((t, k) => t + (k.miktar - (k.karsilanan || 0)), 0)}</span>
                                          <button type="button" className="btn-primary" data-siparisten-ekle={s.siparisNo} style={{ marginLeft: "auto", padding: "3px 9px", fontSize: 11 }}
                                            onClick={() => {
                                              onayiKapat();
                                              setEkKalemler((o) => [...o, ...bekleyen]);
                                              setEkKalemSiparisi((o) => ({ ...o, ...Object.fromEntries(bekleyen.map((k) => [k.id, s.id])) }));
                                              // Satırlar tabloya eklenir, kalan miktarlarla dolu gelir (Kalem Ekle ile aynı).
                                              const yeniGruplar = [...new Set(bekleyen.map((k) => `${k.urunId}|${k.renk}`))];
                                              setEklenenGruplar((o) => [...o, ...yeniGruplar.filter((g) => !o.includes(g))]);
                                              setTeslimMiktarlar((o) => ({ ...o, ...Object.fromEntries(bekleyen.map((k) => [k.id, String(k.miktar - (k.karsilanan || 0))])) }));
                                            }}>
                                            <Plus size={11} /> Bu siparişin kalemlerini ekle
                                          </button>
                                        </div>
                                        <table className="matris-tablo" style={{ borderCollapse: "collapse" }}>
                                          <thead><tr>
                                            <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Ürün</th>
                                            <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Renk</th>
                                            {bedenler.map((b) => <th key={b} className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "center" }}>{b || "—"}</th>)}
                                          </tr></thead>
                                          <tbody>{satirlar.map((r) => (
                                            <tr key={r.a}>
                                              <td style={{ fontSize: 11, padding: "2px 6px", fontWeight: 600 }}>{r.urunAd}</td>
                                              <td className="mono" style={{ fontSize: 11, padding: "2px 6px" }}>{r.renk}</td>
                                              {bedenler.map((b) => <td key={b} className="mono" style={{ fontSize: 11, padding: "2px 6px", textAlign: "center" }}>{r.hucre[b] || "—"}</td>)}
                                            </tr>
                                          ))}</tbody>
                                        </table>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                            <span style={{ fontSize: 10, color: "var(--erp-text-2)", alignSelf: "center" }}>
                              {eklenmemisSayisi > 0
                                ? `Bedenler aşağıda tabloya eklenir, kalan miktarlarla dolu gelir. Eklenmeyi bekleyen ${eklenmemisSayisi} model/renk var — birden fazlasını aynı fişe ekleyebilirsiniz.`
                                : "Bekleyen bütün model/renkler bu fişe eklendi."}
                            </span>

                            {/* ASORTİ — GİRİŞ ALANINDA, sipariş girişindeki gibi. Eskiden her eklenen
                                satırın içinde ayrı bir asorti kutusu vardı; tablo düzenine geçince
                                satır başına kutu koymak tabloyu bozardı. Asorti burada seçilir ve
                                SEÇİLİ model+renge uygulanır; satır ekli değilse aynı anda eklenir. */}
                            <div style={{ flexBasis: "100%", borderTop: "1px dashed var(--erp-line)", paddingTop: 8, marginTop: 2 }}>
                              <div style={{ fontSize: 10, color: "var(--erp-text-2)", marginBottom: 4 }}>
                                Asorti ile doldur — "{(urunler.find((u) => u.id === uId) || {}).ad} · {renk}"
                              </div>
                              <AsortiUygulaKontrolu
                                asortiler={asortiler}
                                bedenSecenekleri={renginBedenleri}
                                olcuTipi={urunOlcuTipi(stok, uId)}
                                onUygula={(sonuc) => {
                                  onayiKapat();
                                  const anahtar = `${uId}|${renk}`;
                                  // Asorti EZER, toplamaz: "bu asortiyi uygula" demek satırın o
                                  // asortiye eşitlenmesi demek. Üstüne eklemek ikinci kez uygulayanı
                                  // sessizce iki katına çıkarırdı.
                                  setTeslimMiktarlar((onceki) => {
                                    const next = { ...onceki };
                                    grupKalemleri(anahtar).forEach((k) => {
                                      if (sonuc[k.beden] != null) next[k.id] = String(sonuc[k.beden]);
                                    });
                                    return next;
                                  });
                                  setEklenenGruplar((onceki) => (onceki.includes(anahtar) ? onceki : [...onceki, anahtar]));
                                }}
                              />
                            </div>
                          </div>

                          {gecerliGruplar.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: "6px 2px" }}>
                              Henüz kalem eklenmedi. Üstten model ve renk seçip "Kalem Ekle" deyin ya da
                              "Kalanların tümünü doldur" ile hepsini bir kerede getirin.
                            </div>
                          ) : (() => {
                            // SİPARİŞ GİRİŞİNDEKİ DÜZEN: satır = model+renk, sütun = beden.
                            // Her satırı kendi kutusunda göstermek ekranı uzatıyordu ve iki farklı
                            // ekranda aynı iş iki farklı biçimde görünüyordu. Beden sütunları
                            // eklenen satırların BİRLEŞİMİ — bir satırda olmayan beden "—" olur.
                            const satirlar = gecerliGruplar.map((anahtar) => {
                              const kalemler = grupKalemleri(anahtar);
                              return { anahtar, kalemler, urunAd: kalemler[0].urunAd, renk: kalemler[0].renk };
                            });
                            const tumBedenler = Array.from(new Set(satirlar.flatMap((s) => s.kalemler.map((k) => k.beden))));
                            const hucreStil = { padding: "4px 6px", textAlign: "center" };

                            return (
                              <div style={{ overflowX: "auto", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff" }}>
                                <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ background: "var(--erp-panel)" }}>
                                      <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px" }}>Ürün</th>
                                      <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px" }}>Renk</th>
                                      {tumBedenler.map((b) => (
                                        <th key={b} style={{ fontSize: 11, textAlign: "center", padding: "5px 8px", whiteSpace: "nowrap" }}>{b || "—"}</th>
                                      ))}
                                      <th style={{ fontSize: 11, textAlign: "right", padding: "5px 8px", borderLeft: "1px dashed var(--erp-line)" }}>Toplam</th>
                                      {/* FİYAT + P.B. (kullanıcı, 14 Eylül): fişte gerçekleşen fiyat yazılabilsin. */}
                                      <th style={{ fontSize: 11, textAlign: "right", padding: "5px 8px" }}>Birim Fiyat</th>
                                      <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px" }}>P.B.</th>
                                      <th style={{ width: 28 }}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {satirlar.map((s) => {
                                      const toplam = s.kalemler.reduce((t, k) => t + (parseFloat(teslimMiktarlar[k.id]) || 0), 0);
                                      return (
                                        <tr key={s.anahtar} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                                          <td style={{ padding: "5px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{s.urunAd}</td>
                                          <td className="mono" style={{ padding: "5px 8px", fontSize: 12, whiteSpace: "nowrap" }}>{s.renk}</td>
                                          {tumBedenler.map((b) => {
                                            const k = s.kalemler.find((x) => x.beden === b);
                                            if (!k) return <td key={b} style={hucreStil}><span style={{ fontSize: 11, color: "var(--erp-border)" }}>—</span></td>;
                                            const kalan = kalanMiktar(k);
                                            const girilen = parseFloat(teslimMiktarlar[k.id]) || 0;
                                            const fazla = girilen > kalan;
                                            const elde = eldeMiktar(k);
                                            const yetersiz = siparis.tip === "Satış" && elde < girilen;
                                            return (
                                              <td key={b} style={hucreStil}>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={teslimMiktarlar[k.id] || ""}
                                                  onChange={(e) => { onayiKapat(); setTeslimMiktarlar({ ...teslimMiktarlar, [k.id]: e.target.value }); }}
                                                  placeholder="0"
                                                  title={`Çıkılacak miktar · kalan ${kalan} · elde ${elde}`}
                                                  style={{
                                                    ...inputStyle, width: 62, padding: "4px 5px", textAlign: "center",
                                                    borderColor: fazla || yetersiz ? "var(--erp-warn)" : "var(--erp-border)",
                                                    color: fazla || yetersiz ? "var(--erp-warn)" : "var(--erp-text)",
                                                    fontWeight: fazla || yetersiz ? 700 : 400,
                                                  }}
                                                />
                                                {/* Uyarı yalnızca sorun VARSA yazılır: her hücreye kalan/elde
                                                    yazmak tabloyu okunmaz hale getiriyordu, o bilgi ipucunda duruyor. */}
                                                {fazla && <div style={{ fontSize: 9, color: "var(--erp-warn)" }}>+{girilen - kalan} fazla</div>}
                                                {yetersiz && !fazla && <div style={{ fontSize: 9, color: "var(--erp-warn)" }}>elde {elde}</div>}
                                              </td>
                                            );
                                          })}
                                          <td className="mono" style={{ padding: "5px 8px", fontSize: 12, fontWeight: 700, textAlign: "right", borderLeft: "1px dashed var(--erp-line)" }}>
                                            {toplam}
                                          </td>
                                          {(() => {
                                            // Fiyat kutuları ürün+renk grubunda ortak; boş bırakılırsa siparişteki fiyat
                                            // kullanılır (ipucunda yazıyor). Sipariş kaydı DEĞİŞMEZ, yalnız fiş.
                                            const ilkKalem = s.kalemler[0] || {};
                                            const anahtar = fiyatAnahtari(ilkKalem);
                                            const siparisFiyat = ilkKalem.birimFiyat || 0;
                                            const siparisPB = ilkKalem.paraBirimi || "TRY";
                                            return (
                                              <>
                                                <td style={{ padding: "2px 4px" }}>
                                                  <input
                                                    className="mono" type="number" step="any" min="0"
                                                    data-teslim-fiyat={anahtar}
                                                    value={teslimFiyatlar[anahtar] !== undefined ? teslimFiyatlar[anahtar] : ""}
                                                    placeholder={String(siparisFiyat)}
                                                    title={`Boş bırakılırsa siparişteki fiyat kullanılır: ${siparisFiyat} ${siparisPB}`}
                                                    onChange={(e) => setTeslimFiyatlar({ ...teslimFiyatlar, [anahtar]: e.target.value })}
                                                    style={{ width: 80, padding: "3px 5px", fontSize: 12, textAlign: "right", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                                  />
                                                </td>
                                                <td style={{ padding: "2px 4px" }}>
                                                  <select
                                                    data-teslim-pb={anahtar}
                                                    value={teslimPBler[anahtar] || siparisPB}
                                                    onChange={(e) => setTeslimPBler({ ...teslimPBler, [anahtar]: e.target.value })}
                                                    style={{ width: 70, padding: "3px 5px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                                  >
                                                    {["TRY", "USD", "EUR"].map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                                                  </select>
                                                </td>
                                              </>
                                            );
                                          })()}
                                          <td style={{ padding: "2px 4px" }}>
                                            <button
                                              type="button"
                                              className="btn-ikon"
                                              title="Bu satırı çıkar"
                                              onClick={() => grupCikar(s.anahtar)}
                                            >
                                              <X size={13} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                          {/* Girilen dağılımdan yeni asorti önerisi — seçili model+renk için. */}
                          {gecerliGruplar.includes(`${uId}|${renk}`) && (
                            <AsortiOlusturTeklifi
                              degerler={Object.fromEntries(grupKalemleri(`${uId}|${renk}`).map((k) => [k.beden, teslimMiktarlar[k.id]]))}
                              bedenSecenekleri={renginBedenleri}
                              asortiler={asortiler}
                              onOlustur={onAsortiOlustur}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {teslimOnayGoster && (() => {
                    const teslimler = tumTeslimKalemleri
                      .map((k) => ({ kalem: k, miktar: parseFloat(teslimMiktarlar[k.id]) || 0 }))
                      .filter((t) => t.miktar > 0);
                    const teslimlerKontrollu = teslimler.map((t) => ({
                      ...t, eslesenSayisi: (stok || []).filter((p) => p.id === t.kalem.urunId).length,
                    }));
                    const hataliVarMi = teslimlerKontrollu.some((t) => t.eslesenSayisi !== 1);
                    return (
                      <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 6 }}>
                          Şunu onaylıyor musunuz? Aşağıdaki ürünlerin stoğu değişecek:
                        </div>
                        {cari && (
                          <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 6 }}>
                            Cari hareketi <b>{teslimDefter === "Muhasebe" ? "hem Genel hem Resmi deftere" : `${teslimDefter} defterine`}</b> işlenecek.
                          </div>
                        )}
                        {/* MATRİS (proje kuralı): ürün satır, beden sütun. Düz liste beş bedenli
                            bir modeli beş kez yazıyordu ve onay ekranında asıl soru — "hangi
                            bedenden kaç çıkacak" — tekrarın altında kayboluyordu. Onay ekranı
                            özellikle önemli: kullanıcı buraya bakıp geri dönülmez bir karar veriyor. */}
                        {(() => {
                          const isaret = siparis.tip === "Alış" ? "+" : "-";
                          const ix = {};
                          const satirlar = [];
                          teslimlerKontrollu.forEach((t) => {
                            const a = `${t.kalem.urunId}|${t.kalem.renk}`;
                            if (!(a in ix)) {
                              ix[a] = satirlar.length;
                              satirlar.push({ ad: t.kalem.urunAd, renk: t.kalem.renk, birim: t.kalem.birim, hucreler: {}, toplam: 0 });
                            }
                            const st = satirlar[ix[a]];
                            st.hucreler[t.kalem.beden] = t;
                            st.toplam = stokYuvarla(st.toplam + t.miktar);
                          });
                          const matris = satirlar.filter((r) => Object.keys(r.hucreler).length > 1);
                          const tekil = satirlar.filter((r) => Object.keys(r.hucreler).length <= 1);
                          const bedenler = bedenSirala(Array.from(new Set(matris.flatMap((r) => Object.keys(r.hucreler)))));
                          // Hatalı kalem uyarısı hücrede yer almıyor (sığmaz); altta ayrı satırda
                          // toplanıyor ki kaydetmeyi engelleyen sebep görünür kalsın.
                          const hatalilar = teslimlerKontrollu.filter((t) => t.eslesenSayisi !== 1);
                          return (
                            <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                              {matris.length > 0 && (
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr>
                                        <th style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", textAlign: "left", padding: "2px 8px 2px 0" }}>ÜRÜN</th>
                                        {bedenler.map((b) => (
                                          <th key={b} className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", textAlign: "center", padding: "2px 7px" }}>{b}</th>
                                        ))}
                                        <th className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", textAlign: "right", padding: "2px 0 2px 10px" }}>TOPLAM</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {matris.map((r, ri) => (
                                        <tr key={ri}>
                                          <td style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px 2px 0", whiteSpace: "nowrap" }}>
                                            {r.ad}
                                            <span className="mono" style={{ fontSize: 11, fontWeight: 400, color: "#7A3B22" }}> · {r.renk}</span>
                                          </td>
                                          {bedenler.map((b) => (
                                            <td key={b} className="mono" style={{ fontSize: 12, textAlign: "center", padding: "2px 7px", color: r.hucreler[b] ? "var(--erp-text)" : "var(--erp-border)", fontWeight: r.hucreler[b] ? 700 : 400 }}>
                                              {r.hucreler[b] ? `${isaret}${r.hucreler[b].miktar}` : "–"}
                                            </td>
                                          ))}
                                          <td className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", padding: "2px 0 2px 10px", whiteSpace: "nowrap" }}>
                                            {isaret}{r.toplam} <span style={{ fontSize: 10, fontWeight: 400, color: "#7A3B22" }}>{r.birim}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {tekil.map((r, ri) => (
                                <div key={ri} className="mono" style={{ fontSize: 12 }}>
                                  <b>{r.ad}</b> · {r.renk}: {isaret}{r.toplam} {r.birim}
                                </div>
                              ))}
                              {hatalilar.map((t) => (
                                <div key={t.kalem.id} className="mono" style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 700 }}>
                                  ⚠ {t.kalem.urunAd} · {t.kalem.renk} {t.kalem.beden} —{" "}
                                  {t.eslesenSayisi === 0 ? "stokta bu ürün bulunamadı!" : `stokta bu id'ye sahip ${t.eslesenSayisi} ürün var — veri hatası!`}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {hataliVarMi && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#9C3D3D", marginBottom: 8, padding: "6px 8px", background: "#FCEAEA", borderRadius: "var(--erp-r-md)" }}>
                            ⚠ Yukarıdaki veri hatası nedeniyle kaydetme engellendi. Lütfen "Vazgeç" deyip sorunlu kalemin miktarını
                            boş bırakın (0 girin), sadece hatasız kalemleri kaydedin — sorunlu kaydı bana bildirin.
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                          data-onay-evet="1" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={teslimOnayla} disabled={hataliVarMi}>
                            Evet, Onayla ve Kaydet
                          </button>
                          <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setTeslimOnayGoster(false)}>
                            Vazgeç, Düzenlemeye Dön
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {!teslimOnayGoster && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                          data-islem-kaydet="1" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={teslimSubmit}>
                        İşlemi Kaydet
                      </button>
                      <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { setShowTeslim(false); setTeslimMiktarlar({}); setTeslimOnayGoster(false); }}>
                        Vazgeç
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Durum ve sil, kart BAŞLIĞINA taşındı — burada tekrar edilmiyor. */}

        </div>
      )}

    </div>
  );
}


