// ================= GÖRSELLE ÜRÜN BULMA =================
//
// Kullanıcı: "Paketlemede üretimin veya stoğun fişi kaybolmuş olabilir. Personel ürünün kodunu
// bilmiyor olabilir. Bu durumda ürünün resmini çekip eşleşen en yakın ürünlerden listelenir
// (üretimden gelmiş ise üretimi olan modeller içerisinden eleme yaparsa daha az arama yapar),
// listeden modeli seçip paketler."
//
// DIŞARIYA HİÇBİR ŞEY GİTMİYOR. Kullanıcı bunu açıkça söyledi: "Stoğumuzda olmayan bir şeyi
// istemiyoruz. İçine girmediğim bilgiyi istemiyorum." Bu yüzden burada ne bir servis çağrısı,
// ne API anahtarı, ne de dil modeli var. Karşılaştırma, KULLANICININ KENDİ ürün görselleriyle
// cihazın içinde yapılıyor: çevrimdışı çalışır, ücret çıkarmaz, uydurma bilgi üretemez.
// Ekranda görünen her şey (ad, renk, fiyat, stok) kullanıcının girdiği kayıttan gelir.
//
// SONUÇ ÖNERİDİR, KARAR DEĞİL. Liste sıralanır, seçimi personel yapar. Yanlış modeli sessizce
// paketlemek, hiç önermemekten pahalıdır.
//
// ASIL KAZANÇ HAVUZU DARALTMAKTA. 400 model arasında değil, üretimi/siparişi olan 15 model
// arasında aramak hem daha hızlı hem daha isabetli. Havuzu ÇAĞIRAN veriyor — bu modül "neyin
// arasında arayacağını" kendi kararlaştırmıyor.

// ---- İMZA ------------------------------------------------------------------------------------
//
// Her görselden iki imza çıkıyor:
//   renk  — 28 kutulu histogram. Doygunluğu düşük pikseller (siyah/gri/kahve tonları, ki bu
//           atölyede çoğunluk) AÇIKLIK eksenine, doygun olanlar RENK TONU eksenine düşüyor.
//           Yalnız ton kullanılsaydı siyah ile beyaz aynı kutuya girerdi.
//   biçim — 8×8 gri tonlama ortalama karması (aHash), 64 bit. Modelin kaba silüetini tutuyor.
//
// ARKA PLAN KIRPILIYOR: fotoğrafın orta %60'ı alınıyor. Tezgâhın rengi karenin kenarlarını
// dolduruyor ve kırpılmazsa histogram ürünü değil MASAYI ölçüyordu.
const IMZA_HIST_KUTU = 28;      // 12 ton × 2 açıklık + 4 gri
const IMZA_KIRPMA = 0.6;

// Piksel dizisinden imza üretir. Kanvasla uğraşmayan SAF kısım burası — birim testi bunu ölçüyor.
// `pikseller`: RGBA dizisi (Uint8ClampedArray ya da düz dizi), `en`/`boy`: kırpılmış ölçüler.
function imzaHesapla(pikseller, en, boy) {
  const hist = new Array(IMZA_HIST_KUTU).fill(0);
  const griler = [];
  for (let i = 0; i < en * boy; i++) {
    const r = pikseller[i * 4] / 255, g = pikseller[i * 4 + 1] / 255, b = pikseller[i * 4 + 2] / 255;
    const enB = Math.max(r, g, b), enK = Math.min(r, g, b);
    const acik = (enB + enK) / 2;
    const doygun = enB === enK ? 0 : (enB - enK) / (1 - Math.abs(2 * acik - 1) || 1);
    if (doygun < 0.2) {
      hist[24 + Math.min(3, Math.floor(acik * 4))] += 1;   // gri ekseni
    } else {
      let ton;
      if (enB === r) ton = ((g - b) / (enB - enK)) % 6;
      else if (enB === g) ton = (b - r) / (enB - enK) + 2;
      else ton = (r - g) / (enB - enK) + 4;
      ton = ((ton * 60) + 360) % 360;
      const tonKutu = Math.min(11, Math.floor(ton / 30));
      hist[tonKutu * 2 + (acik < 0.5 ? 0 : 1)] += 1;
    }
    griler.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const toplam = en * boy || 1;
  for (let i = 0; i < IMZA_HIST_KUTU; i++) hist[i] /= toplam;

  // aHash: 8×8'e indirgeyip her hücreyi ORTALAMAYLA karşılaştır. Mutlak parlaklığa değil
  // parlaklık DESENİNE bakıyor; aynı model farklı ışıkta çekilse de deseni korur.
  const kucuk = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let t = 0, n = 0;
      const y0 = Math.floor((y * boy) / 8), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * boy) / 8));
      const x0 = Math.floor((x * en) / 8), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * en) / 8));
      for (let yy = y0; yy < y1 && yy < boy; yy++) {
        for (let xx = x0; xx < x1 && xx < en; xx++) { t += griler[yy * en + xx]; n += 1; }
      }
      kucuk.push(n ? t / n : 0);
    }
  }
  const ortalama = kucuk.reduce((t, v) => t + v, 0) / (kucuk.length || 1);
  const ahash = kucuk.map((v) => (v >= ortalama ? "1" : "0")).join("");
  return { hist, ahash };
}

// İki histogramın kesişimi: her kutuda küçük olanı topla. 1 = aynı renk dağılımı.
function histKesisim(a, b) {
  if (!a || !b) return 0;
  let t = 0;
  for (let i = 0; i < IMZA_HIST_KUTU; i++) t += Math.min(a[i] || 0, b[i] || 0);
  return t;
}

function ahashBenzerlik(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let ayni = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) ayni += 1;
  return ayni / a.length;
}

// RENK AĞIRLIĞI DAHA YÜKSEK. Aynı modelin siyahı ile bejini ayıran şey renk; biçim ikisinde de
// aynı. Biçim, farklı modelleri ayırmaya yarıyor ve tek başına bu ürün grubunda zayıf
// (ayakkabıların silüeti birbirine benziyor), o yüzden destekleyici ağırlıkta.
function imzaBenzerligi(a, b) {
  if (!a || !b) return 0;
  return 0.7 * histKesisim(a.hist, b.hist) + 0.3 * ahashBenzerlik(a.ahash, b.ahash);
}

// Havuzu skora göre sıralar. SAF fonksiyon: kanvas yok, tarayıcı yok, test edilebilir.
// `havuz`: [{ urunId, urunAd, renk, gorsel, imza, ... }] — imzası olmayan aday ELENMEZ, en sona
// düşer ve sebebi görünür: görseli olmayan ürün "eşleşmedi" değil "görseli yok"tur.
function gorselEslestir(hedefImza, havuz, { enFazla = 8, esik = 0 } = {}) {
  const puanli = (havuz || []).map((aday) => ({
    ...aday,
    skor: aday.imza ? imzaBenzerligi(hedefImza, aday.imza) : -1,
  }));
  return puanli
    // Eşik YALNIZCA puanlanabilmiş adaylara uygulanıyor. İmzasız aday (skor -1) her hâlükârda
    // listede kalıyor: "eşleşmedi" ile "görseli yok" farklı iki şey ve ikincisi kullanıcının
    // düzeltebileceği bir eksik. Sessizce elemek, eksiği hiç fark ettirmezdi.
    .filter((a) => a.skor < 0 || a.skor >= esik)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, enFazla);
}

// ---- TARAYICI TARAFI ---------------------------------------------------------------------------
//
// İmzalar SAKLANMIYOR. Ürün kaydına yeni bir alan eklemek, değişmez kural gereği şema + okuma +
// SQL + silme testi yükü getirirdi ve karşılığı yok: imza görselden anında türetiliyor. Oturum
// içinde bellekte tutuluyor, aynı görsel iki kez işlenmiyor.
const imzaOnbellek = new Map();

function dataUrlImzasi(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);
  if (imzaOnbellek.has(dataUrl)) return Promise.resolve(imzaOnbellek.get(dataUrl));
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const kare = 48;
        const tuval = document.createElement("canvas");
        tuval.width = kare; tuval.height = kare;
        const ctx = tuval.getContext("2d", { willReadFrequently: true });
        // Ortadan kırpma: kenarlar tezgâh/zemin, orta ürün.
        const kn = Math.round(img.width * IMZA_KIRPMA);
        const kb = Math.round(img.height * IMZA_KIRPMA);
        ctx.drawImage(img, Math.round((img.width - kn) / 2), Math.round((img.height - kb) / 2),
          kn, kb, 0, 0, kare, kare);
        const veri = ctx.getImageData(0, 0, kare, kare).data;
        const imza = imzaHesapla(veri, kare, kare);
        imzaOnbellek.set(dataUrl, imza);
        resolve(imza);
      } catch (e) {
        // Bozuk/erişilemeyen görsel eşleştirmeyi DURDURMAMALI; o aday imzasız kalır ve listede
        // sebebiyle görünür.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Havuzun imzalarını hazırlar. Görseli olmayan aday atılmıyor — listede "görseli yok" olarak
// görünmesi, sessizce kaybolmasından iyi: kullanıcı eksiği ancak böyle fark eder.
async function havuzImzalari(havuz) {
  const sonuc = [];
  for (const aday of havuz || []) {
    sonuc.push({ ...aday, imza: await dataUrlImzasi(aday.gorsel) });
  }
  return sonuc;
}

// ---- ORTAK BİLEŞEN -----------------------------------------------------------------------------
//
// Tek giriş noktası: fotoğrafı çek/seç, havuzla karşılaştır, sıralı listeyi göster, seçimi
// çağırana bildir. Havuzu ve seçim sonrası ne olacağını ÇAĞIRAN belirliyor; bu bileşen yalnızca
// "hangi ürün" sorusunu soruyor. Paketleme, katalog, stok girişi — hepsi aynı bileşeni kullanır.
function GorselIleBul({ havuz, onSec, acikMi, onKapat, altBilgi, showToast }) {
  const [foto, setFoto] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const galeriRef = useRef(null);
  const kameraRef = useRef(null);

  async function dosyaSecildi(e) {
    const dosya = e.target.files && e.target.files[0];
    // Girdi her seferinde temizleniyor: aynı fotoğraf ikinci kez seçilince `change` tetiklenmiyor
    // ve kullanıcı "bir şey olmadı" sanıyordu (bkz. ColorSwatch).
    e.target.value = "";
    if (!dosya) return;
    setCalisiyor(true);
    setSonuclar(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(dosya);
      setFoto(dataUrl);
      const hedef = await dataUrlImzasi(dataUrl);
      if (!hedef) { showToast("Fotoğraf okunamadı"); setCalisiyor(false); return; }
      const hazir = await havuzImzalari(havuz);
      setSonuclar(gorselEslestir(hedef, hazir, { enFazla: 8 }));
    } catch (err) {
      showToast(`Fotoğraf işlenemedi: ${err && err.message ? err.message : err}`);
    }
    setCalisiyor(false);
  }

  function kapat() {
    setFoto(""); setSonuclar(null); setCalisiyor(false);
    onKapat();
  }

  if (!acikMi) return null;

  return (
    <div data-foto-panel="1" style={{ border: "1.5px solid #3D6B8A", borderRadius: "var(--erp-r-md)", background: "#EAF0F4", padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <b style={{ fontSize: 13, color: "#2E5670" }}>Fotoğrafla ürün bul</b>
        <span style={{ fontSize: 11, color: "#2E5670" }}>
          {havuz.length} aday arasında aranıyor. Karşılaştırma cihazda yapılır, hiçbir yere
          gönderilmez.
        </span>
        <button type="button" className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }} onClick={kapat}>
          Kapat
        </button>
      </div>
      {altBilgi}

      <input ref={galeriRef} data-foto-dosya="galeri" type="file" accept="image/*" style={{ display: "none" }} onChange={dosyaSecildi} />
      <input ref={kameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={dosyaSecildi} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => kameraRef.current && kameraRef.current.click()}>
          <Camera size={13} /> Fotoğraf çek
        </button>
        <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => galeriRef.current && galeriRef.current.click()}>
          <ImageIcon size={13} /> Galeriden seç
        </button>
        {foto ? <img src={foto} alt="" style={{ width: 46, height: 46, objectFit: "cover", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)" }} /> : null}
        {calisiyor ? <span style={{ fontSize: 12, color: "#2E5670" }}>Karşılaştırılıyor…</span> : null}
      </div>

      {sonuclar && sonuclar.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-warn)", marginTop: 8 }}>
          Aday listesi boş — arama yapılacak model yok.
        </div>
      )}

      {sonuclar && sonuclar.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {/* SIRALAMA ÖNERİ. Skor gösteriliyor ki personel ilk sıranın ne kadar güvenli olduğunu
              görsün: %80 ile %31 arasındaki fark, listeye bakma biçimini değiştirir. */}
          {sonuclar.map((s) => (
            <button
              key={`${s.urunId}|${s.renk}`}
              type="button"
              data-foto-aday={`${s.urunAd}|${s.renk}`}
              onClick={() => onSec(s)}
              style={{
                display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: "6px 10px",
              }}
            >
              {s.gorsel
                ? <img src={s.gorsel} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "var(--erp-r-sm)", flex: "none" }} />
                : <span style={{ width: 40, height: 40, borderRadius: "var(--erp-r-sm)", background: "var(--erp-head)", flex: "none" }} />}
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{s.urunAd}</span>
                <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{s.renk}{s.etiket ? ` · ${s.etiket}` : ""}</span>
              </span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: s.skor < 0 ? "var(--erp-warn)" : "var(--erp-info)", flex: "none" }}>
                {s.skor < 0 ? "görseli yok" : `%${Math.round(s.skor * 100)}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
