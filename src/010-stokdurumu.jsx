// Stok durumu tablosu — ürün kartı ve Rezervasyon Deposu AYNI bileşeni kullanır.
// İki ayrı tablo yazmak, birinde yapılan düzeltmenin diğerine taşınmamasına yol açardı; ayrıca
// iki ekranda farklı sayılar görmek güveni bitirir.
//
// `satirlar` öğeleri stokDurumu() çıktısına ek olarak { renk, beden } ve isteğe bağlı
// { urunAd, urunId, kategori } taşır.
// =============================================================================================
// STOK DURUMU — MATRİS GÖRÜNÜMÜ
//
// Düz tablo aynı malzemeyi her beden için tekrar yazıyordu: "Çelikli Taban" beş satır, "Taban
// Siyah" beş satır, "Taban Kahve" beş satır. Yirmi satır, sekiz malzeme.
//
// Ama bu tablo diğer matrislerden FARKLI: satır başına yedi metrik var (stok, rezerve, serbest,
// satın alma, beklenen, talep, açık). Bedeni sütuna çıkarmak yedi ayrı matris demek olurdu.
// Bu yüzden iki katmanlı:
//
//   ÜST KATMAN  hücrede STOK, altında varsa kırmızı AÇIK. İlk bakışta sorulan iki soru bunlar:
//               "neyim var" ve "neyim eksik". Sağda satır toplamları (rezerve, serbest, talep).
//   ALT KATMAN  satıra tıklanınca o malzemenin bedenleri için TAM yedi sütunlu tablo açılır.
//               Hiçbir bilgi kaybolmuyor, yalnızca bir tık ötesine taşınıyor.
// `onSatinAlPlanla(urunId, renk, urunAd)` ve `onAlisFisi({...})` verilirse satır sonuna bir
// işlem sütunu eklenir. İkisi de İSTEĞE BAĞLI: bu bileşen başka ekranlarda da kullanılabilsin
// diye buton varlığı çağırana bırakıldı — Depo dışında kimse bu iki yolu açmıyor.
function StokDurumuMatrisi({ satirlar, onGoToSiparis, onGoToUrun, onSatinAlPlanla, onAlisFisi }) {
  const [acikGrup, setAcikGrup] = useState(null);
  const butonlarVar = !!(onSatinAlPlanla || onAlisFisi);

  const index = {};
  const gruplar = [];
  (satirlar || []).forEach((s) => {
    // TEK ÜRÜN TEK SATIR.
    //
    // Kullanıcı: "Tek stok tek satırda olacak; renk, beden, boyut tıklayınca açılıp detay
    // verecek. Stoğu 14 adet ise — renk ve bedenler dahil — 14 gösterecek; tıklayınca hangi renk
    // hangi beden orada görünecek."
    //
    // Önce `urunId|renk` ile gruplanıyordu: üç renkli bir malzeme listede üç satır kaplıyordu ve
    // "bu üründen toplam kaç var" sorusu satırları gözle toplamayı gerektiriyordu.
    const anahtar = s.urunId;
    if (!(anahtar in index)) {
      index[anahtar] = gruplar.length;
      gruplar.push({
        anahtar, urunId: s.urunId, urunAd: s.urunAd, birim: s.birim,
        kategori: s.kategori, hucreler: {}, satirlar: [],
        stok: 0, rezerve: 0, serbest: 0, toplamTalep: 0, acikToplam: 0, yoldaSerbest: 0, yoldaToplamAlim: 0,
      });
    }
    const g = gruplar[index[anahtar]];
    g.hucreler[`${s.renk}|${s.beden}`] = s;
    g.satirlar.push(s);
    ["stok", "rezerve", "serbest", "toplamTalep", "acikToplam", "yoldaSerbest", "yoldaToplamAlim"].forEach((a) => {
      g[a] = stokYuvarla(g[a] + (s[a] || 0));
    });
  });

  // Beden sütunları grup satırından tamamen kalktı: bir üründe birden çok renk olduğu için aynı
  // beden birden çok kez geçiyor ve tek satıra sığmıyordu. Ayrıntı zaten alt katmanda,
  // renk · beden olarak satır satır duruyor.
  const matris = gruplar;
  const tekil = [];
  const bedenler = [];

  const sayi = (n, renk, kalin) => (
    <span className="mono" style={{ color: renk, fontWeight: kalin ? 700 : 400 }}>
      {n === 0 ? "—" : n}
    </span>
  );

  const grupSatiri = (g, hucreCiz) => (
    <React.Fragment key={g.anahtar}>
      <tr
        onClick={() => setAcikGrup(acikGrup === g.anahtar ? null : g.anahtar)}
        style={{ borderTop: "1px solid #E4D8C0", cursor: "pointer", ...(g.acikToplam > 0 ? { background: "#FCE7DA55" } : {}) }}
      >
        <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
          <span
            onClick={(e) => { e.stopPropagation(); onGoToUrun && onGoToUrun(g.urunId); }}
            style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <KategoriIkonu kategori={g.kategori} size={13} />
            {g.urunAd}
          </span>
          {/* Renk artık satırda değil, detayda: tek ürün tek satır. */}
        </td>
        {hucreCiz}
        <td className="mono" style={{ fontSize: 12, textAlign: "right", padding: "5px 8px", borderLeft: "2px solid #E4D8C0", whiteSpace: "nowrap" }}>
          {sayi(g.stok, "var(--erp-text)", true)} <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{g.birim}</span>
        </td>
        <td style={{ fontSize: 12, textAlign: "right", padding: "5px 8px" }}>{sayi(g.rezerve, "var(--erp-brown)", true)}</td>
        <td style={{ fontSize: 12, textAlign: "right", padding: "5px 8px" }}>{sayi(g.serbest, g.serbest < 0 ? "var(--erp-warn)" : "var(--erp-primary)", true)}</td>
        <td style={{ fontSize: 12, textAlign: "right", padding: "5px 8px" }}>{sayi(g.toplamTalep, "var(--erp-text)")}</td>
        <td className="mono" style={{ fontSize: 13, textAlign: "right", padding: "5px 8px", borderLeft: "2px solid #E4D8C0", whiteSpace: "nowrap" }}>
          {g.acikToplam > 0
            ? <span style={{ fontWeight: 700, color: "#6B3FA0" }}>{g.acikToplam} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--erp-text-3)" }}>{g.birim}</span></span>
            : <span style={{ color: "var(--erp-primary)", fontWeight: 700 }}>✓</span>}
          {/* Yoldaki alım varsa gösteriliyor: ihtiyacın neden beklenenden düşük olduğunu
              açıklayan tek bilgi bu. Olmadan kullanıcı "eksiğim 30 ama 10 yazıyor" der. */}
          {/* Grup rozetinde de yoldaki TOPLAM: rezerveli alım da "yolda" sayılır, yalnızca serbest
              stoğa eklenmez. Rozette hiç görünmemesi "sipariş vermedim" izlenimi veriyordu. */}
          {g.yoldaToplamAlim > 0 && (
            <div className="mono" style={{ fontSize: 9, color: "var(--erp-info)", fontWeight: 400 }}>
              {g.yoldaToplamAlim} yolda
            </div>
          )}
        </td>
        {butonlarVar && (
          /* Tıklama satırın açılıp kapanmasını tetiklemesin: buradaki iki buton başka ekrana
             götürüyor, satırı açmak istemiyor. */
          <td onClick={(e) => e.stopPropagation()} style={{ padding: "3px 6px", whiteSpace: "nowrap", borderLeft: "1px dashed #E4D8C0" }}>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
              {/* DURUM ROZETİ — hangi yol izlendiyse o yazar, diğer düğme kalkar.
                  Kullanıcı: "Satınalma veya alış fişi hangisi yapılır ise rozet ekle ve diğerini
                  kaldır. Alış fişi ile giriş yapıldığında eksik kalmamıştır; satınalma siparişi
                  yapılmış ise alış fişi de olacaktır."

                  Üç durum var ve her birinde YAPILACAK İŞ farklı:
                    açık var, sipariş yok → iki yol da açık (sipariş ver ya da doğrudan al)
                    sipariş verilmiş      → "sipariş verildi"; sıradaki iş mal gelince ALIŞ FİŞİ
                    açık yok, yolda yok   → "karşılandı"; yapılacak bir şey kalmadı
                  Yapılmayacak bir işin düğmesini göstermek, kullanıcıya olmayan bir seçenek
                  sunuyor ve ikinci kez sipariş vermeye davet ediyordu. */}
              {g.yoldaToplamAlim > 0 && (
                <span
                  className="mono"
                  title={`${g.yoldaToplamAlim} birim sipariş edilmiş, henüz gelmemiş — geldiğinde alış fişiyle girin`}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
                    color: "var(--erp-info)", background: "#3D6B8A14", border: "1px solid #3D6B8A44",
                  }}
                >
                  sipariş verildi · {g.yoldaToplamAlim}
                </span>
              )}
              {g.acikToplam <= 0 && g.yoldaToplamAlim <= 0 && (
                <span
                  className="mono"
                  title="Açık yok, yolda mal yok — bu malzeme için yapılacak bir şey kalmadı"
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
                    color: "var(--erp-primary)", background: "#4E6B4E14", border: "1px solid #4E6B4E44",
                  }}
                >
                  karşılandı
                </span>
              )}
              {/* SATIN AL — Planlama'daki satın alma panelini bu malzeme+renk için açar.
                  Yalnızca açığı olan satırda görünür: açık yoksa planlamada karşılığı da yok. */}
              {/* SATIN AL yalnızca açık VARKEN ve henüz SİPARİŞ VERİLMEMİŞKEN görünür.
                  Sipariş verilmiş bir malzemede tekrar göstermek, ikinci siparişe davetti. */}
              {onSatinAlPlanla && g.acikToplam > 0 && g.yoldaToplamAlim <= 0 && (
                <button
                  type="button"
                  onClick={() => {
                    // AÇIK MİKTARLAR DA GİDİYOR (kullanıcı, 7 Eylül: "satın al tuşu da aynı
                    // mantıkta çalışmalı"). Alış fişinde olduğu gibi: Depo'da zaten görünen
                    // sayıyı planlama ekranında yeniden yazmak gereksiz bir adım.
                    // AÇIK SATIRLAR RENGİYLE BİRLİKTE — alış fişiyle aynı biçim (bkz. yukarıdaki
                    // Alış Fişi düğmesi). Eskiden `g.renk` gidiyordu ve hep boştu.
                    const kalemler = g.satirlar
                      .filter((x) => x.acikToplam > 0)
                      .map((x) => ({ renk: x.renk || "", beden: x.beden || "", miktar: x.acikToplam }));
                    onSatinAlPlanla(g.urunId, g.urunAd, kalemler);
                  }}
                  className="mono"
                  title={`${g.urunAd} için Planlama ekranındaki satın alma panelini açar (açık: ${g.acikToplam})`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--erp-r-md)",
                    border: "1px solid #C9A063", background: "#E1611F1A", color: "var(--erp-brown)", cursor: "pointer",
                  }}
                >
                  <Compass size={10} />Satın Al
                </button>
              )}
              {/* ALIŞ FİŞİ — doğrudan alış girişi (sipariş olmadan) ya da sipariş edilen malın
                  teslim alınması. Açık VE yolda yoksa gizleniyor: o satırda yapılacak iş yok,
                  düğme kalabalık yapıyordu. Stok tazelemek isteyen ürün kartından fiş kesebilir. */}
              {onAlisFisi && (g.acikToplam > 0 || g.yoldaToplamAlim > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    // AÇIK SATIRLAR RENGİYLE BİRLİKTE gidiyor (kullanıcı, 11 Eylül: "ihtiyaç 880 çift
                    // Gold rengi ama alış fişinde fazla gösteriyor").
                    //
                    // Satır "tek ürün tek satır" düzenine geçince (bir ürünün bütün renkleri tek
                    // grupta) grubun `renk` alanı YOK oldu ama düğme `g.renk` göndermeye devam
                    // etti — hep boş. Miktarlar da yalnız BEDENE göre toplanıyordu: iki rengin aynı
                    // bedeni birbirini eziyordu. Fişe renksiz bir kalem geliyor, aynı ihtiyaç MRP'den
                    // Gold olarak ikinci kez geliyordu.
                    const kalemler = g.satirlar
                      .filter((x) => x.acikToplam > 0)
                      .map((x) => ({ renk: x.renk || "", beden: x.beden || "", miktar: x.acikToplam }));
                    onAlisFisi({ urunId: g.urunId, urunAd: g.urunAd, kalemler });
                  }}
                  className="mono"
                  title={g.acikToplam > 0
                    ? `${g.urunAd} için yeni alış fişini açığı yazılmış olarak açar`
                    : `${g.urunAd} için boş bir alış fişi açar`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--erp-r-md)",
                    border: "1px solid #7FA3BE", background: "#3D6B8A1A", color: "var(--erp-info)", cursor: "pointer",
                  }}
                >
                  <Receipt size={10} />Alış Fişi
                </button>
              )}
            </div>
          </td>
        )}
        <td style={{ fontSize: 12, textAlign: "right", padding: "5px 4px", color: "var(--erp-text-3)" }}>
          {acikGrup === g.anahtar ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </td>
      </tr>
      {acikGrup === g.anahtar && (
        <tr style={{ background: "var(--erp-panel)" }}>
          <td colSpan={(matris.length > 0 ? bedenler.length : 1) + 6 + (butonlarVar ? 1 : 0)} style={{ padding: "8px 12px" }}>
            {/* TAM DETAY: yedi sütunlu asıl tablo, yalnızca bu malzemenin satırlarıyla.
                Matris sıkıştırırken bilgi kaybetmemenin yolu — kaybolan şey burada duruyor. */}
            <StokDurumuTablosu satirlar={g.satirlar} onGoToSiparis={onGoToSiparis} onGoToUrun={onGoToUrun} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  const baslikStil = { fontSize: 10, color: "var(--erp-text-2)", padding: "5px 8px", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {matris.length > 0 && (
        <>
        {/* İKİ SAYININ NE OLDUĞU YAZILI. Hücrede alt alta iki rakam vardı ve hiçbir yerde ne
            oldukları söylenmiyordu; kullanıcı alttakini "gerçek ihtiyaç" diye kendisi çözmüştü. */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "var(--erp-text-2)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className="mono" style={{ fontWeight: 700, color: "#221B14" }}>12</span>
            elde olan (stok)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "#6B3FA0", background: "#6B3FA014", border: "1px solid #6B3FA033", borderRadius: "var(--erp-r-pill)", padding: "0 5px" }}>35</span>
            satın alınacak (açık) — yoldaki alımlar düşülmüş
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...baslikStil, textAlign: "left" }}>MALZEME</th>
                {[].map((b) => (
                  <th key={b} className="mono" style={{ ...baslikStil, textAlign: "center", fontWeight: 700 }}>{b}</th>
                ))}
                <th style={{ ...baslikStil, textAlign: "right", borderLeft: "2px solid #E4D8C0" }} title="Elde fiilen duran toplam">STOK</th>
                <th style={{ ...baslikStil, textAlign: "right", color: "var(--erp-brown)" }} title="Stoğun siparişlere ayrılmış kısmı — stok yoksa 0 olur">AYRILAN</th>
                <th style={{ ...baslikStil, textAlign: "right", color: "var(--erp-primary)" }} title="stok − rezerve">SERBEST</th>
                <th style={{ ...baslikStil, textAlign: "right" }} title="Siparişlerin istediği toplam">TALEP</th>
                <th
                  style={{ ...baslikStil, textAlign: "right", color: "#6B3FA0", fontWeight: 700, borderLeft: "2px solid #E4D8C0" }}
                  title={"Satın alınması gereken miktar.\n\n" +
                         "Ham çıkarma (talep − stok) DEĞİL: yoldaki alımlar da düşülüyor. 40 talep, " +
                         "10 stok, 20'si sipariş edilip yolda ise ihtiyaç 10'dur — yoldakini ikinci " +
                         "kez sipariş etmemek için."}
                >İHTİYAÇ</th>
                {butonlarVar && <th style={{ ...baslikStil, textAlign: "right", borderLeft: "1px dashed #E4D8C0" }} />}
                <th style={{ width: 24 }} />
              </tr>
            </thead>
            <tbody>
              {/* TEK ÜRÜN TEK SATIR — ayrıntı bir tık ötede.
                  Satırda ürünün TOPLAM stoğu duruyor; renk ve ölçü kırılımı tıklanınca açılan alt
                  katmanda, `renk · beden` satırları hâlinde. Önce hem renk satırlara bölünüyor hem
                  de her beden ayrı sütun oluyordu: üç renkli dokuz bedenli bir malzeme listede üç
                  satır × dokuz sütun kaplıyor, "bu üründen kaç var" sorusu gözle toplamayı
                  gerektiriyordu. */}
              {matris.map((g) => grupSatiri(g, (
                    <td
                      className="mono"

                      style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", borderLeft: "1px solid #EFE5D2", color: "var(--erp-text-3)", whiteSpace: "nowrap" }}
                    >
                      {(() => {
                        const renkSayisi = new Set(g.satirlar.map((x) => x.renk)).size;
                        const olcuSayisi = Object.keys(g.hucreler).length;
                        return `${renkSayisi} renk · ${olcuSayisi} ölçü — detay için tıklayın`;
                      })()}
                    </td>
                  )))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tekil.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...baslikStil, textAlign: "left" }}>BEDENSİZ MALZEME</th>
                <th style={{ ...baslikStil, textAlign: "right", borderLeft: "2px solid #E4D8C0" }}>STOK</th>
                <th style={{ ...baslikStil, textAlign: "right", color: "var(--erp-brown)" }} title="Stoğun siparişlere ayrılmış kısmı — stok yoksa 0 olur">AYRILAN</th>
                <th style={{ ...baslikStil, textAlign: "right", color: "var(--erp-primary)" }}>SERBEST</th>
                <th style={{ ...baslikStil, textAlign: "right" }}>TALEP</th>
                <th style={{ ...baslikStil, textAlign: "right", color: "#6B3FA0", fontWeight: 700, borderLeft: "2px solid #E4D8C0" }}>İHTİYAÇ</th>
                {butonlarVar && <th style={{ ...baslikStil, textAlign: "right", borderLeft: "1px dashed #E4D8C0" }} />}
                <th style={{ width: 24 }} />
              </tr>
            </thead>
            <tbody>{tekil.map((g) => grupSatiri(g, null))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StokDurumuTablosu({ satirlar, urunSutunu, onGoToSiparis, onGoToUrun, birim }) {
  const [acikSatir, setAcikSatir] = useState(null);
  // MATRİS (kullanıcı, 15 Eylül: "matris düzeni yapalım, neden hep bozuluyor?").
  //
  // DÜRÜST CEVAP: bozulmadı — bu tablo hiç matrise ÇEVRİLMEMİŞTİ. Yukarıdaki "matris-muaf" notu
  // benim kararımdı: satır başına yedi metrik var (stok, ayrılan, serbest, alış siparişi, beklenen,
  // talep, açık), hepsini tek matrise koymak mümkün değil diye liste bırakılmıştı. Ama kullanıcının
  // istediği okuma biçimi matris: hangi bedende ne var, tek bakışta.
  //
  // ÇÖZÜM: bir seferde BİR metrik gösteren matris + metrik seçici. Yedi metrik yedi ayrı matris
  // demek değil; kullanıcı hangisini okumak istiyorsa onu seçiyor. Ayrıntı (talepler, yoldakiler)
  // hücreye dokununca açılan satırda — liste görünümündeki detayın aynısı.
  const METRIKLER = [
    { key: "stok", ad: "Stok", renk: "var(--erp-text)" },
    { key: "serbest", ad: "Serbest", renk: "var(--erp-primary)" },
    { key: "beklenenSerbest", ad: "Beklenen serbest", renk: "var(--erp-info)" },
    { key: "talep", ad: "Talep", renk: "var(--erp-text-2)" },
    { key: "acikToplam", ad: "Açık", renk: "#6B3FA0" },
  ];
  const [gorunum, setGorunum] = useState("matris");   // matris | liste
  const [metrik, setMetrik] = useState("stok");

  const SUTUNLAR = [
    { ad: "STOK", ipucu: "Elde fiilen duran miktar" },
    // "REZERVE" adı yanıltıyordu: kullanıcı "rezerve siparişimiz var, neden rezervede çıkmıyor?"
    // diye sordu. Sütun rezervasyon TALEBİNİ değil, o talebe STOKTAN ayrılan kısmı gösteriyor —
    // stok yoksa ayrılacak bir şey de yok. Rezervasyon talebinin tamamı TALEP sütununda.
    { ad: "AYRILAN", ipucu: "Stoğun açık taleplere ayrılmış kısmı — STOKTAN ayrılır, stok yoksa 0 olur. Elle yapılan bir işlem değil: stok, en eski talepten başlayarak dağıtılır. Rezervasyon talebinin tamamı TALEP, karşılanamayan kısmı AÇIK sütununda. Satıra tıklayın, hangi siparişin aldığı görünür.", renk: "var(--erp-brown)" },
    { ad: "SERBEST", ipucu: "stok − ayrılan · bugün başka bir işe verilebilecek", renk: "var(--erp-primary)" },
    { ad: "ALIŞ SİPARİŞİ", ipucu: "Alış siparişi verilmiş, henüz gelmemiş toplam. Parantez içindeki kısım başka bir siparişe REZERVELİ — geldiğinde serbest stoğa girmez.", renk: "var(--erp-info)" },
    // Başlık "BEKLENEN" idi ve iki türlü okunabiliyordu: beklenen STOK mu, beklenen İHTİYAÇ mı?
    // Kullanıcı "-1 olması gerekmez mi?" diye sordu — ihtiyaç olarak okumuş. Ad netleştirildi.
    { ad: "BEKLENEN SERBEST", ipucu: "serbest + tahsis edilmemiş alış siparişi · mallar geldiğinde başka bir işe verilebilecek miktar. Bir talebe fiilen tahsis edilen yoldaki alım sayılmaz; talebi stoktan karşılanmış rezerveli alım ise sayılır, çünkü artık sahipsizdir.", renk: "var(--erp-info)" },
    { ad: "TALEP", ipucu: "Siparişlerin reçeteye göre istediği toplam — rezervasyon defterindeki tam ihtiyaç. Stok olsun olmasın buraya yazılır." },
    { ad: "AÇIK", ipucu: "talep − stoktan karşılanan − yoldaki tahsisli · hiçbir kaynakla karşılanamayan kısım, SATIN ALINMASI GEREKEN budur", renk: "#6B3FA0" },
  ];

  const toplam = (alan) => stokYuvarla(satirlar.reduce((t, s) => {
    // Sanal alan: SATIN ALMA sütunu rezervesiz + rezerveli yoldakini birlikte gösteriyor.
    if (alan === "yoldaToplamTumu") return t + (s.yoldaToplamAlim || 0);
    return t + (s[alan] || 0);
  }, 0));

  // Matris verisi: satır = (ürün +) renk, sütun = beden.
  const matrisSatirlari = [];
  const bedenKumesi = new Set();
  satirlar.forEach((s2) => {
    const anahtar = `${s2.urunId || ""}|${s2.renk}`;
    let r = matrisSatirlari.find((x) => x.anahtar === anahtar);
    if (!r) { r = { anahtar, urunAd: s2.urunAd, renk: s2.renk, hucre: {} }; matrisSatirlari.push(r); }
    bedenKumesi.add(s2.beden || "");
    r.hucre[s2.beden || ""] = s2;
  });
  const bedenler = bedenSirala([...bedenKumesi]);
  const aktifMetrik = METRIKLER.find((m) => m.key === metrik) || METRIKLER[0];

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Görünüm ve metrik seçici: matris tek metrik gösterir, liste yedi sütunun hepsini. */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        {[{ k: "matris", ad: "Matris" }, { k: "liste", ad: "Liste" }].map((g) => (
          <button key={g.k} type="button" data-stok-gorunum={g.k} onClick={() => setGorunum(g.k)}
            style={{ padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${gorunum === g.k ? "var(--erp-brown)" : "var(--erp-border)"}`,
              background: gorunum === g.k ? "#8A5A381A" : "#fff", color: gorunum === g.k ? "var(--erp-brown)" : "var(--erp-text-2)" }}>
            {g.ad}
          </button>
        ))}
        {gorunum === "matris" && (
          <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", marginLeft: 6 }}>
            {METRIKLER.map((m) => (
              <button key={m.key} type="button" data-stok-metrik={m.key} onClick={() => setMetrik(m.key)}
                style={{ padding: "3px 9px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${metrik === m.key ? m.renk : "var(--erp-border-2)"}`,
                  background: metrik === m.key ? `${m.renk}1A` : "#fff", color: metrik === m.key ? m.renk : "var(--erp-text-2)" }}>
                {m.ad}
              </button>
            ))}
          </span>
        )}
      </div>

      {gorunum === "matris" ? (
        <table className="matris-tablo" data-stok-matris={aktifMetrik.key} style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>
                {urunSutunu ? "HAMMADDE / RENK" : "RENK"}
              </th>
              {bedenler.map((b) => (
                <th key={b} className="mono" style={{ fontSize: 11, padding: "5px 8px", textAlign: "center", color: "var(--erp-text-2)" }}>{b || "—"}</th>
              ))}
              <th className="mono" style={{ fontSize: 10, padding: "5px 8px", textAlign: "center", color: "var(--erp-text-2)", borderLeft: "1px dashed #C9B99A" }}>TOP.</th>
            </tr>
          </thead>
          <tbody>
            {matrisSatirlari.map((r) => {
              const satirToplam = bedenler.reduce((t, b) => t + ((r.hucre[b] || {})[aktifMetrik.key] || 0), 0);
              return (
                <tr key={r.anahtar} style={{ borderTop: "1px solid #E4D8C0" }}>
                  <td style={{ fontSize: 12, padding: "5px 8px", whiteSpace: "nowrap" }}>
                    {urunSutunu && <b>{r.urunAd} </b>}
                    <span className="mono" style={{ color: "var(--erp-text-2)" }}>{r.renk}</span>
                  </td>
                  {bedenler.map((b) => {
                    const hucreSatiri = r.hucre[b];
                    const deger = hucreSatiri ? (hucreSatiri[aktifMetrik.key] || 0) : null;
                    return (
                      <td key={b} className="mono" data-stok-hucre={`${r.renk}|${b}`}
                        onClick={() => hucreSatiri && setAcikSatir(acikSatir === `${hucreSatiri.urunId || ""}|${hucreSatiri.renk}|${hucreSatiri.beden}` ? null : `${hucreSatiri.urunId || ""}|${hucreSatiri.renk}|${hucreSatiri.beden}`)}
                        title={hucreSatiri ? "Ayrıntı için dokunun" : ""}
                        style={{ fontSize: 13, padding: "6px 8px", textAlign: "center", whiteSpace: "nowrap",
                          cursor: hucreSatiri ? "pointer" : "default", fontWeight: 600,
                          color: deger == null ? "var(--erp-border)" : deger < 0 ? "var(--erp-warn)" : aktifMetrik.renk }}>
                        {hucreSatiri ? (deger || (aktifMetrik.key === "acikToplam" ? "✓" : "—")) : "—"}
                      </td>
                    );
                  })}
                  <td className="mono" style={{ fontSize: 13, padding: "6px 8px", textAlign: "center", fontWeight: 700,
                    borderLeft: "1px dashed #C9B99A", color: satirToplam < 0 ? "var(--erp-warn)" : aktifMetrik.renk }}>
                    {satirToplam}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
      <table className="matris-tablo" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {urunSutunu && <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>HAMMADDE</th>}
            <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>RENK / ÖLÇÜ</th>
            {SUTUNLAR.map((c) => (
              <th
                key={c.ad}
                title={c.ipucu}
                style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", color: c.renk || "var(--erp-text-2)", whiteSpace: "nowrap", cursor: "help" }}
              >
                {c.ad}
              </th>
            ))}
            <th style={{ width: 24 }} />
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s, i) => {
            const anahtar = `${s.urunId || ""}|${s.renk}|${s.beden}`;
            const acik = acikSatir === anahtar;
            const hucre = (deger, renk, kalin) => (
              <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap", color: renk, fontWeight: kalin ? 700 : 400 }}>
                {deger === 0 ? "—" : deger}
              </td>
            );
            return (
              <React.Fragment key={i}>
                <tr
                  onClick={() => setAcikSatir(acik ? null : anahtar)}
                  style={{ borderTop: "1px solid #E4D8C0", cursor: "pointer", ...(s.acikToplam > 0 ? { background: "#FCE7DA55" } : {}) }}
                >
                  {urunSutunu && (
                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); onGoToUrun && onGoToUrun(s.urunId); }}
                        style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <KategoriIkonu kategori={s.kategori} size={13} />
                        {s.urunAd}
                      </span>
                    </td>
                  )}
                  {/* matris-muaf: BU GÖRÜNÜM liste; matris ayrı bir görünüm olarak var (15 Eylül).
                      Listede satır başına yedi metrik duruyor ve satır açılıp detay gösteriyor;
                      matris tek metrik gösterip ayrıntıyı aynı detay satırıyla açıyor. */}
                  <td className="mono" style={{ fontSize: 11, padding: "5px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{s.renk} · {s.beden}</td>
                  {hucre(s.stok, "var(--erp-text)")}
                  {hucre(s.rezerve, "var(--erp-brown)", true)}
                  {hucre(s.serbest, s.serbest < 0 ? "var(--erp-warn)" : "var(--erp-primary)", true)}
                  {/* SATIN ALMA: YOLDAKİ TOPLAM.
                      Önce yalnızca REZERVESİZ kısım yazılıyordu. Alış siparişi rezerveli açıldıysa
                      (bir satış siparişine bağlı) sütun "—" görünüyor ve kullanıcı "satın alma
                      oluşturduğum stokları göstermiyor" diyordu — bilgi yalnızca satır detayında
                      duruyordu. Şimdi toplam yazılıyor, rezerveli kısım parantezde ayrı.
                      BEKLENEN sütunu ise rezervesiz kalmaya devam ediyor: o mal geldiğinde serbest
                      olmayacak, oraya eklemek "yolda mal var" diye ikinci kez söz vermeye yol açardı. */}
                  <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap", color: s.yoldaToplamAlim > 0 ? "var(--erp-info)" : "var(--erp-border)" }}>
                    {s.yoldaToplamAlim > 0
                      ? <>
                          {s.yoldaToplamAlim}
                          {s.yoldaRezerveliAlim > 0 && (
                            <span style={{ fontSize: 10, color: "var(--erp-brown)" }}> ({s.yoldaRezerveliAlim} rez.)</span>
                          )}
                        </>
                      : "—"}
                  </td>
                  {hucre(s.beklenenSerbest, s.beklenenSerbest < 0 ? "var(--erp-warn)" : "var(--erp-info)", true)}
                  {hucre(s.toplamTalep, "var(--erp-text)")}
                  {/* Aynı kavram, aynı renk: matris hücresindeki "açık" ile bu sütun aynı şeyi
                      söylüyor, ikisi de mor. Farklı renkler aynı sayıyı iki ayrı şey sanmaya yol açıyordu. */}
                  <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: s.acikToplam > 0 ? "#6B3FA0" : "var(--erp-primary)" }}>
                    {s.acikToplam > 0 ? s.acikToplam : "✓"}
                  </td>
                  <td style={{ padding: "5px 4px", color: "var(--erp-text-3)" }}>
                    {acik ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                </tr>

                {acik && (
                  <tr style={{ background: "var(--erp-panel)" }}>
                    <td colSpan={urunSutunu ? 11 : 10} style={{ padding: "8px 12px" }}>
                      {/* Detay: sayıların NEREDEN geldiği. Toplamlara bakıp "neden böyle?" diye
                          sormanın cevabı burada; hangi sipariş ne istiyor, hangi alış yolda. */}
                      <div style={{ display: "grid", gap: 8 }}>
                        {/* TALEP NEREYE GİTTİ — tek satırlık denklem.
                            Kullanıcı sordu: "talep ile ayrılan stok arasında ne fark var?"
                            Fark şu: TALEP bir ihtiyaçtır, AYRILAN o ihtiyacın stoktan karşılanan
                            kısmıdır. Talep üçe bölünür ve toplamları her zaman talebi verir:
                            stoktan ayrılan + yoldan tahsisli + açık. Denklemi yazmak, üç sütunun
                            birbiriyle ilişkisini tek bakışta gösteriyor. */}
                        {s.toplamTalep > 0 && (
                          <div className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)", padding: "4px 8px" }}>
                            talep <b style={{ color: "var(--erp-text)" }}>{s.toplamTalep}</b>
                            {" = "}stoktan ayrılan <b style={{ color: "var(--erp-brown)" }}>{s.rezerve}</b>
                            {" + "}yoldan tahsisli <b style={{ color: "var(--erp-info)" }}>{s.yoldaRezerve}</b>
                            {" + "}açık <b style={{ color: s.acikToplam > 0 ? "#6B3FA0" : "var(--erp-primary)" }}>{s.acikToplam}</b>
                          </div>
                        )}
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)" }}>TALEP EDEN SİPARİŞLER</span>
                          {s.talepler.length === 0 ? (
                            <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 3 }}>Bu malzeme için rezervasyon yok.</div>
                          ) : (
                            <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
                              {s.talepler.map((t, j) => (
                                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                                  <span
                                    onClick={() => t.siparisId && onGoToSiparis && onGoToSiparis(t.siparisId)}
                                    className="mono"
                                    style={{ fontWeight: 700, color: "var(--erp-info)", cursor: "pointer", minWidth: 90 }}
                                  >
                                    {t.siparisNo || "—"}
                                  </span>
                                  {/* ÜRETİM NO GÖSTERİLİYOR.
                                      Aynı siparişin farklı üretimleri aynı malzemeyi istediğinde
                                      satırlar birbirinin AYNISI görünüyordu ("aynı talebi birden
                                      fazla yapmış" gibi). Talebin hangi üretimden geldiği yazılınca
                                      hem ayırt ediliyor hem gerçek bir çift kayıt varsa görünür oluyor. */}
                                  {t.uretimNo && (
                                    <span className="mono" style={{ fontSize: 10, color: "var(--erp-brown)", background: "#F5EDE3", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)", padding: "0 5px" }}>
                                      üretim {t.uretimNo}
                                    </span>
                                  )}
                                  <span className="mono" style={{ color: "var(--erp-text-2)" }}>
                                    talep <b>{t.kalan}</b> · stoktan <b style={{ color: "var(--erp-brown)" }}>{t.karsilanan}</b>
                                    {t.yolda > 0 && <> · yolda <b style={{ color: "var(--erp-info)" }}>{t.yolda}</b></>}
                                    {t.acik > 0
                                      ? <> · açık <b style={{ color: "#6B3FA0" }}>{t.acik}</b></>
                                      : <> · <b style={{ color: "var(--erp-primary)" }}>karşılanıyor ✓</b></>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)" }}>YOLDAKİ ALIŞLAR</span>
                          {s.bekleyenAlislar.length === 0 ? (
                            <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 3 }}>Bekleyen alış yok.</div>
                          ) : (
                            <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
                              {s.bekleyenAlislar.map((a, j) => (
                                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                                  <span
                                    onClick={() => onGoToSiparis && onGoToSiparis(a.alisId)}
                                    className="mono"
                                    style={{ fontWeight: 700, color: "var(--erp-brown)", cursor: "pointer", minWidth: 90 }}
                                  >
                                    {a.alisNo}
                                  </span>
                                  <span className="mono" style={{ color: "var(--erp-text-2)" }}>
                                    <b>{a.miktar}</b> bekliyor · {a.durum}
                                    {a.rezerveliMi
                                      ? <> · <b style={{ color: "var(--erp-brown)" }}>rezerveli</b> ({a.rezervasyonlar.map((r) => r.siparisNo || "—").join(", ")})</>
                                      : <> · <b style={{ color: "var(--erp-info)" }}>serbest</b> — geldiğinde serbest stoğa eklenir</>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {satirlar.length > 1 && (
          <tfoot>
            <tr style={{ borderTop: "2px solid #C9B99A", background: "var(--erp-panel)" }}>
              <td colSpan={urunSutunu ? 2 : 1} style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", padding: "7px 8px" }}>
                Toplam {birim ? `(${birim})` : ""}
              </td>
              {/* Toplam satırında da SATIN ALMA = yoldaki toplam. Sütun rezerveliyi sayarken
                  toplamın saymaması, ikisinin birbirini tutmamasına yol açıyordu. */}
              {["stok", "rezerve", "serbest", "yoldaToplamTumu", "beklenenSerbest", "toplamTalep", "acikToplam"].map((alan) => (
                <td
                  key={alan}
                  className="mono"
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "7px 8px", textAlign: "right",
                    color: alan === "acikToplam" ? (toplam(alan) > 0 ? "#6B3FA0" : "var(--erp-primary)")
                      : alan === "rezerve" ? "var(--erp-brown)"
                      : alan === "serbest" ? "var(--erp-primary)"
                      : alan.startsWith("yolda") || alan === "beklenenSerbest" ? "var(--erp-info)" : "var(--erp-text)",
                  }}
                >
                  {toplam(alan)}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      )}
    </div>
  );
}

function KategoriIkonu({ kategori, size = 18, renkSabit }) {
  // renkSabit: koyu zemin üzerinde kullanılırken kategori rengi okunmaz olur; çağıran taraf
  // kontrast için sabit bir renk verebilir.
  const renk = renkSabit || CAT_COLORS[kategori] || "var(--erp-text-2)";
  const ortak = { size, color: renk };
  if (kategori === "Mamul") return <PackageCheck {...ortak} />;
  if (kategori === "Yarı Mamul") return <Scissors {...ortak} />;
  if (kategori === "Hizmet") return <Hammer {...ortak} />;
  return <Layers {...ortak} />;
}

