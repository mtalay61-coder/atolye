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

// ETİKET YAZICISI KAYDIRMA (v1.744.15, 075 `etiketKaydirmaOku`). Tanımlar › Görünüm; bu cihaza kaydedilir. Deneme etiketi:
// 60×40 mm, kenarda 1 mm çerçeve + orta çizgiler + kenar yazıları — basılınca hangi yöne kaç mm kaydığı cetvelle ölçülür.
function EtiketKaydirmaAyari({ showToast }) {
  const [a, setA] = useState(() => etiketKaydirmaOku());
  const yaz = (yeni) => setA(etiketKaydirmaKaydet(yeni));
  const kutu = (alan, baslik, arti, eksi) => (
    <div data-etiket-kaydirma-satiri={alan} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderBottom: "1px solid var(--erp-line-soft)" }}>
      <div style={{ minWidth: 150, fontSize: 13, fontWeight: 700 }}>{baslik}</div>
      <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => yaz({ ...a, [alan]: a[alan] - 0.5 })}>{eksi} 0,5</button>
      <input type="number" step="0.5" data-etiket-kaydirma={alan} value={a[alan]} onChange={(e) => yaz({ ...a, [alan]: e.target.value })}
        style={{ ...inputStyle, width: 80, textAlign: "right" }} />
      <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>mm</span>
      <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => yaz({ ...a, [alan]: a[alan] + 0.5 })}>{arti} 0,5</button>
    </div>
  );
  const deneme = () => etiketYazdir([`
    <div style="position:absolute;inset:1mm;border:0.4mm solid #000"></div>
    <div style="position:absolute;left:50%;top:1mm;bottom:1mm;border-left:0.2mm dashed #000"></div>
    <div style="position:absolute;top:50%;left:1mm;right:1mm;border-top:0.2mm dashed #000"></div>
    <div style="position:absolute;left:2mm;top:50%;transform:translateY(-50%);font-size:9px">SOL</div>
    <div style="position:absolute;right:2mm;top:50%;transform:translateY(-50%);font-size:9px">SAĞ</div>
    <div style="position:absolute;top:2mm;left:0;right:0;font-size:9px">ÜST</div>
    <div style="position:absolute;bottom:2mm;left:0;right:0;font-size:9px">ALT</div>
    <div style="font-size:11px;font-weight:700;background:#fff;padding:0 1mm">DENEME ${a.yatay} / ${a.dikey} mm</div>
  `], { genislikMM: 60, yukseklikMM: 40 });
  return (
    <div data-etiket-kaydirma-ayari="1">
      <TanimBasligi ad="Etiket yazıcısı" />
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
        Basılan etiket kayık çıkıyorsa buradan düzeltin; <b>bu cihaza</b> kaydedilir (her bilgisayarın yazıcısı ayrı ayarlanır).
        Önce <b>deneme etiketi</b> basın: çerçeve etiketin kenarlarına eşit uzaklıkta olmalı. Çerçeve sola kaymışsa <b>Sağa</b>'yı,
        yukarı kaymışsa <b>Aşağı</b>'yı kayma kadar artırın ve yeniden deneyin.
      </p>
      {kutu("yatay", "Sağa / sola", "Sağa +", "Sola −")}
      {kutu("dikey", "Aşağı / yukarı", "Aşağı +", "Yukarı −")}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" data-etiket-deneme="1" onClick={deneme}><Printer size={14} /> Deneme etiketi bas (6×4 cm)</button>
        <button type="button" className="btn-ghost" data-etiket-kaydirma-sifirla="1" disabled={!a.yatay && !a.dikey}
          onClick={() => { yaz({ yatay: 0, dikey: 0 }); if (showToast) showToast("Etiket kaydırma sıfırlandı"); }} style={{ padding: "5px 12px", fontSize: 12 }}>Sıfırla</button>
      </div>
    </div>
  );
}
