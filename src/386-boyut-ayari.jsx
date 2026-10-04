// ================= GÖRÜNÜM: BOYUT AYARLARI (29 Eylül, v1.521.0) =================
//
// Kullanıcı: "Sürükle gibi butonların yerini taşıyabileceğimiz, boyutlarını değiştirebileceğimiz v.s. tüm
// uygulama için — çok mu zor olur?" Önerilen iki adımın 1.'si (kullanıcı: "Evet başla 1"): BÜTÜN uygulamada
// bir kerede geçerli boyut ayarları. (2. adım — blokları sürükleyip sıralayan "düzenleme kipi" — ekran ekran
// gelecek.)
//
// NASIL: CSS `zoom`. Ekranların çoğu satır içi piksel stil taşıyor (`padding: "6px 12px"`, `width: 48`);
// sınıf/değişkenle büyütmek yüzlerce yere dokunmak demekti. `zoom` bir öğeyi içindeki bütün piksel
// değerleriyle birlikte ölçekler — satır içi stiller de dahil. Üç ayrı kadran:
//   • Genel ölçek  → `html` (her şey: yazı, boşluk, tablo, pencere)
//   • Düğmeler     → `.btn-primary / .btn-ghost / .btn-save / .btn-danger` (standart düğmeler)
//   • Giriş kutuları → `input / select / textarea` (onay kutusu ve radyo hariç)
// Değerler CSS değişkeni (`--olcek-*`, 100-app'teki genel stil kuralları okuyor); değişince sayfa yeniden
// çizilmeden anında uygulanıyor.
//
// CİHAZ BAŞINA (localStorage): telefonla bilgisayarın ihtiyacı farklı — telefonda büyük düğme, bilgisayarda
// sık ekran. Buluta yazılsaydı bir cihazda yapılan ayar diğerini bozardı (mobil düzen kipiyle aynı karar).

// "ÇOK KÜÇÜK" (v1.522.0 — kullanıcı: "Çok küçük de olsun, küçük ekranlar için"): telefonda daha çok şey sığsın.
const BOYUT_SECENEKLERI = {
  genel: [{ k: "cokKucuk", ad: "Çok küçük", o: 0.8 }, { k: "kucuk", ad: "Küçük", o: 0.9 }, { k: "normal", ad: "Normal", o: 1 }, { k: "buyuk", ad: "Büyük", o: 1.1 }, { k: "cokBuyuk", ad: "Çok büyük", o: 1.25 }],
  dugme: [{ k: "cokKucuk", ad: "Çok küçük", o: 0.72 }, { k: "kucuk", ad: "Küçük", o: 0.85 }, { k: "normal", ad: "Normal", o: 1 }, { k: "buyuk", ad: "Büyük", o: 1.15 }, { k: "cokBuyuk", ad: "Çok büyük", o: 1.3 }],
  kutu: [{ k: "cokKucuk", ad: "Çok küçük", o: 0.8 }, { k: "kucuk", ad: "Küçük", o: 0.9 }, { k: "normal", ad: "Normal", o: 1 }, { k: "buyuk", ad: "Büyük", o: 1.12 }, { k: "cokBuyuk", ad: "Çok büyük", o: 1.25 }],
};
const BOYUT_AYAR_ANAHTARI = "gorunum:boyut";
const BOYUT_VARSAYILAN = { genel: "normal", dugme: "normal", kutu: "normal" };

// Geçersiz/eksik değer varsayılana döner (eski ya da elle bozulmuş kayıt ekranı kırmasın).
function boyutAyariNormalle(ayar) {
  const a = { ...BOYUT_VARSAYILAN };
  Object.keys(BOYUT_SECENEKLERI).forEach((alan) => {
    const v = ayar && ayar[alan];
    if (BOYUT_SECENEKLERI[alan].some((s) => s.k === v)) a[alan] = v;
  });
  return a;
}

function boyutOlcegi(alan, k) {
  const s = (BOYUT_SECENEKLERI[alan] || []).find((x) => x.k === k);
  return s ? s.o : 1;
}

function boyutAyariOku() {
  try {
    const ham = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(BOYUT_AYAR_ANAHTARI) : null;
    return boyutAyariNormalle(ham ? JSON.parse(ham) : null);
  } catch (e) {
    return { ...BOYUT_VARSAYILAN };
  }
}

function boyutAyariUygula(ayar) {
  if (typeof document === "undefined" || !document.documentElement) return;
  const a = boyutAyariNormalle(ayar);
  const kok = document.documentElement.style;
  kok.setProperty("--olcek-genel", String(boyutOlcegi("genel", a.genel)));
  kok.setProperty("--olcek-dugme", String(boyutOlcegi("dugme", a.dugme)));
  kok.setProperty("--olcek-kutu", String(boyutOlcegi("kutu", a.kutu)));
}

function boyutAyariKaydet(ayar) {
  const a = boyutAyariNormalle(ayar);
  try { window.localStorage.setItem(BOYUT_AYAR_ANAHTARI, JSON.stringify(a)); } catch (e) { /* özel sekme: bu oturumda kalır */ }
  boyutAyariUygula(a);
  return a;
}

// İLK KAREDEN ÖNCE: paket yüklenirken bir kez uygulanır — uygulama önce normal boyutta çizilip sonra
// büyümesin (mobil düzen kipindeki "ilk karede doğru" dersi).
try { boyutAyariUygula(boyutAyariOku()); } catch (e) { /* ayar okunamazsa normal boyut */ }

// Tanımlar > Görünüm'deki kadranlar. Değişiklik ANINDA uygulanır (önizleme ayrı ekran değil, uygulamanın kendisi).
function BoyutAyarlari({ showToast }) {
  const [ayar, setAyar] = useState(() => boyutAyariOku());
  const degistir = (alan, k) => setAyar(boyutAyariKaydet({ ...ayar, [alan]: k }));
  const satir = (alan, baslik, aciklama) => (
    <div data-boyut-satiri={alan} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderBottom: "1px solid var(--erp-line-soft)" }}>
      <div style={{ minWidth: 150 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{baslik}</div>
        <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{aciklama}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {BOYUT_SECENEKLERI[alan].map((s) => {
          const secili = ayar[alan] === s.k;
          return (
            <button key={s.k} type="button" data-boyut-sec={`${alan}:${s.k}`} onClick={() => degistir(alan, s.k)}
              style={{ padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${secili ? "var(--erp-purple)" : "var(--erp-border)"}`,
                background: secili ? "#6B4E8A1A" : "#fff", color: secili ? "var(--erp-purple)" : "var(--erp-text-2)" }}>
              {s.ad}
            </button>
          );
        })}
      </div>
    </div>
  );
  const varsayilanMi = Object.keys(BOYUT_VARSAYILAN).every((k) => ayar[k] === BOYUT_VARSAYILAN[k]);
  return (
    <div data-boyut-ayarlari="1">
      <TanimBasligi ad="Boyut" />
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
        Bütün ekranlarda geçerli. Seçtiğiniz anda uygulanır; <b>bu cihaza</b> kaydedilir — telefon ve bilgisayar ayrı ayarlanabilir.
      </p>
      {satir("genel", "Genel ölçek", "yazı, boşluk, tablo — her şey")}
      {satir("dugme", "Düğmeler", "Kaydet, Ekle, Vazgeç gibi düğmeler")}
      {satir("kutu", "Giriş kutuları", "yazı, sayı, tarih ve seçim kutuları")}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
        <button type="button" className="btn-ghost" data-boyut-varsayilan="1" disabled={varsayilanMi}
          onClick={() => { setAyar(boyutAyariKaydet(BOYUT_VARSAYILAN)); if (showToast) showToast("Boyutlar varsayılana döndü"); }}
          style={{ padding: "5px 12px", fontSize: 12 }}>
          Varsayılana dön
        </button>
        {/* Örnek: ayarın etkisini Tanımlar'dan çıkmadan görmek için bir düğme + kutu. */}
        <span style={{ fontSize: 11, color: "var(--erp-text-3)", marginLeft: "auto" }}>örnek:</span>
        <button type="button" className="btn-primary btn-save" tabIndex={-1} style={{ pointerEvents: "none" }}><Save size={14} /> Kaydet</button>
        <input readOnly value="123" style={{ ...inputStyle, width: 80 }} tabIndex={-1} />
      </div>
    </div>
  );
}
