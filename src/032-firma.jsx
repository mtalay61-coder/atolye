// =============================================================================================
// FİRMA SEÇİMİ (v1.642.0 — kullanıcı: "Uygulamayı pazarlamak için nasıl yapmalıyım?" → firma kodu yapısı → "Başla")
//
// Bağlantının kendisi 030'un başında (AKTIF_FIRMA, SUPABASE_URL): açılışta cihazdaki `firma:secim`den bir kez
// çözülür. Bu dosya o seçimi DEĞİŞTİREN yolları taşır:
//   · Firma kodu → `firmalar.json` (GitHub Pages'te, uygulamanın yanında). Rehberde kod düz yazılmaz, ÖZETİ (SHA-256)
//     anahtar olur: depo herkese açık; müşteri listesi oradan okunamasın. Değer yalnız proje adresi + AÇIK anahtar —
//     ikisi de zaten tarayıcıya gömülmek üzere tasarlanmış; güvenlik RLS + giriş jetonunda.
//   · Gelişmiş: adres + anahtar elle (rehbere eklenmemiş yeni kurulum için).
//   · Bağlantı: `?firma=KOD` — müşteriye tek tıklık bağlantı. Yalnız REHBERDEKİ kodlar çözülür; bir bağlantıyla
//     kullanıcıyı keyfi bir sunucuya (oltalama) göndermek mümkün değil, adres de yalnız *.supabase.co olabilir.
//
// DEĞİŞTİRME KURALLARI (veri güvenliği):
//   1. Buluta gönderilmemiş kayıt (bekleyen yazma / bekleyen kayıt defteri) varken firma DEĞİŞTİRİLEMEZ: defter bu
//      cihazın tek kopyası ve firmadan bağımsız anahtarlarda duruyor — değişimden sonra ÖTEKİ firmanın buluta
//      gönderilirdi (v1.556 "Jut" korumasını gevşetmemek için).
//   2. Firmaya özel doğrudan localStorage anahtarları (oturum, tema önbelleği, tanım silinenleri) eski firmanın
//      saklama kutusuna (`firma:sakli:<ref>`) kaldırılır, yeni firmanınki geri konur — iki firma arasında gidip
//      gelen cihazda oturum ve görünüm kaybolmaz, ama birbirine de karışmaz. Yerel veri deposu zaten firma başına
//      ayrı (depo-koprusu.js).
//   3. Bağlantı denenmeden kaydedilmez (`/auth/v1/settings` — anahtar o projeye ait mi).
//   4. Değişimden sonra sayfa yeniden yüklenir: bellekteki veri eski firmanın; çalışırken başka projeye kaymak onu
//      yeni firmaya yazdırabilirdi.
// =============================================================================================
const FIRMA_REHBERI_ADRESLERI = ["firmalar.json", "https://mtalay61-coder.github.io/atolye/firmalar.json"];
const FIRMAYA_OZEL_ANAHTARLAR = [
  "atolye:oturum", "oturum:aktif", "oturum:sonEtkinlik", "firma:gorunum", "tanim:silinenler", "bekleyen:yazma", "bekleyen:kayitlar",
];

// Kod: küçük harf, Türkçe harfler sadeleşir, yalnız [a-z0-9-]. "Öz Deri" → "ozderi" (kullanıcı nasıl yazarsa yazsın
// aynı özete düşsün).
function firmaKoduNormal(kod) {
  const harita = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };
  return String(kod || "").trim().toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (h) => harita[h] || h)
    .replace(/[^a-z0-9-]/g, "");
}
// Proje kimliği (adresin alt alan adı): yerel depo, saklama kutusu ve "aynı firma mı" karşılaştırması bununla.
function firmaRefi(url) {
  const m = /^https:\/\/([a-z0-9]{8,40})\.supabase\.co$/.exec(String(url || ""));
  return m ? m[1] : "";
}
// Yerel depo / saklama kutusu kimliği: demo için "demo", gerçek firmada proje kimliği (depo-koprusu ile aynı kural).
function firmaDepoKimligi(f) {
  return f && f.demo === true ? "demo" : firmaRefi(f && f.url);
}
const DEMO_FIRMA = Object.freeze({ kod: "demo", demo: true });
async function firmaKoduOzeti(kod) {
  const veri = new TextEncoder().encode("atolye-firma:" + firmaKoduNormal(kod));
  const ozet = await crypto.subtle.digest("SHA-256", veri);
  return Array.from(new Uint8Array(ozet)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Rehberden kodu çözer: { kod, url, anahtar } | null (rehber okundu, kod yok). Rehber hiç okunamazsa hata.
async function firmaKoduCoz(kod) {
  const n = firmaKoduNormal(kod);
  if (n.length < 3) throw new Error("Firma kodu en az 3 harf ya da rakam olmalı");
  const ozet = await firmaKoduOzeti(n);
  let sonHata = null;
  for (const adres of FIRMA_REHBERI_ADRESLERI) {
    try {
      const y = await fetch(`${adres}?t=${Date.now()}`, { cache: "no-store" });
      if (!y.ok) throw new Error(`HTTP ${y.status}`);
      const rehber = await y.json();
      const kayit = rehber && rehber.firmalar && rehber.firmalar[ozet];
      if (!kayit) return null;
      return { kod: n, url: String(kayit.url || ""), anahtar: String(kayit.anahtar || "").trim() };
    } catch (e) { sonHata = e; }
  }
  throw new Error(`Firma listesi okunamadı (${(sonHata && sonHata.message) || "bağlantı yok"})`);
}
// Anahtar o projeye ait mi? Auth ayarları açık anahtarla okunabilen, veri içermeyen tek uç.
async function firmaBaglantisiniDene(f) {
  let y;
  try { y = await fetch(`${f.url}/auth/v1/settings`, { headers: { apikey: f.anahtar } }); }
  catch (e) { throw new Error("Sunucuya ulaşılamadı — adresi ve internet bağlantısını kontrol edin"); }
  if (y.status === 401 || y.status === 403) throw new Error("Anahtar bu projeye ait değil");
  if (!y.ok) throw new Error(`Sunucu yanıtı: HTTP ${y.status}`);
  return true;
}
// Değişimi engelleyen bir şey var mı? Metin = sebep, null = serbest.
function firmaDegisimEngeli(bekleyenYazma = bekleyenYazmalariOku(), bekleyenKayit = bekleyenKayitlariOku()) {
  const sayi = Object.keys(bekleyenYazma || {}).length + Object.keys(bekleyenKayit || {}).length;
  if (!sayi) return null;
  return `Bu cihazda buluta gönderilmemiş ${sayi} kayıt grubu var. Önce bu firmada giriş yapın — kayıtlar internet varken kendiliğinden gönderilir. Gönderilmemiş kayıt varken firma değiştirilemez (kayıt öteki firmanın bulutuna gidebilirdi).`;
}
// Seçimi yazar (sayfayı YENİDEN YÜKLEMEZ — çağıran yükler). Dönüş: seçim değişti mi. Engel varsa hata fırlatır.
//
// FİRMA HERKESTE SORULUR (v1.643.0 — kullanıcı: "benim şuan kullandığım dahil herkeste istensin, standart olsun"):
// seçimsiz cihaz uygulamayı açamıyor (100 AtolyeERP kapısı). Ana firmanın cihazları da bir kez kodunu girer. O cihaz
// zaten o projenin verisini taşıyor (seçimsiz = ana proje): AYNI PROJE seçilince saklama/temizleme YAPILMAZ ve bekleyen
// kayıt ENGEL DEĞİLDİR — defter aynı projeye gidecek; yalnız seçim kaydı yazılır. Engel ve saklama kutusu yalnız
// gerçekten BAŞKA projeye geçerken.
// Bir projenin saklama kutusunu geri koyar. BEKLEYEN DEFTER DE GERİ GELİR (v1.645.3): kutuya ancak o projeden ayrılırken
// girer ve yalnız AYNI projeye dönüşte açılır; defterin işaret ettiği yerel veri o projenin kendi deposunda
// (depo-koprusu, firma başına ayrı) duruyor — yeniden gönderim aynı buluta gider. Cihazda zaten bir defter varsa
// (beklenmez) dokunulmaz: ezilirse o kayıtlar kaybolurdu.
function firmaSaklamaKutusunuAc(ref, depo) {
  try {
    const geri = JSON.parse(depo.getItem(`firma:sakli:${ref}`) || "{}") || {};
    for (const [a, d] of Object.entries(geri)) {
      if (/^bekleyen:/.test(a) && depo.getItem(a)) continue;
      depo.setItem(a, d);
    }
  } catch (e) { /* bozuk saklama kutusu: temiz başlanır */ }
  depo.removeItem(`firma:sakli:${ref}`);
}
function firmaSeciminiDegistir(yeni, depo = localStorage, mevcut = firmaSecimiOku()) {
  const demoMu = !!(yeni && yeni.demo === true);
  if (!yeni || (!demoMu && !firmaBaglantisiGecerli(yeni))) throw new Error((yeni && firmaAnahtariSorunu(yeni.anahtar)) || "Adres geçersiz — https://<proje>.supabase.co olmalı");
  const kayit = demoMu ? JSON.stringify({ kod: "demo", demo: true })
    : JSON.stringify({ kod: firmaKoduNormal(yeni.kod), url: yeni.url, anahtar: String(yeni.anahtar).trim() });
  // Seçimsiz cihazın verisi ana projeye ait (v1.642 öncesi hep ana proje).
  const eskiRef = firmaDepoKimligi(mevcut || VARSAYILAN_FIRMA);
  const yeniRef = firmaDepoKimligi(yeni);
  if (yeniRef === eskiRef) {
    // Demodan "Çık" seçimi siler; ana firmaya dönen cihaz seçimsiz görünür (= ana proje). O projenin kutusu varsa
    // (demoya geçerken saklanan oturum + bekleyen defter) şimdi geri gelir.
    if (depo.getItem(`firma:sakli:${yeniRef}`) !== null) firmaSaklamaKutusunuAc(yeniRef, depo);
    const degisti = depo.getItem(FIRMA_SECIM_ANAHTARI) !== kayit;
    depo.setItem(FIRMA_SECIM_ANAHTARI, kayit);
    return degisti;
  }
  // DEMOYA GEÇİŞ bekleyen kayıtla da serbest (v1.645.3 — kullanıcı: "Demoda girişe tıklayınca tepkisiz kalıyor"):
  // demo buluta hiçbir şey göndermez, defter saklama kutusunda bekler ve aynı projeye dönünce geri gelir. GERÇEK başka
  // firmaya geçiş yine yasak — orada defterin sahibi olmayan bir buluta gitme ihtimali var.
  const engel = demoMu ? null : firmaDegisimEngeli();
  if (engel) throw new Error(engel);
  const sakli = {};
  for (const a of FIRMAYA_OZEL_ANAHTARLAR) {
    const d = depo.getItem(a);
    if (d !== null) sakli[a] = d;
    depo.removeItem(a);
  }
  depo.setItem(`firma:sakli:${eskiRef}`, JSON.stringify(sakli));
  firmaSaklamaKutusunuAc(yeniRef, depo);
  depo.setItem(FIRMA_SECIM_ANAHTARI, kayit);
  return true;
}
// Değiştir + adres çubuğundaki ?firma= parametresini sil + yeniden yükle.
function firmaDegistirVeYenile(yeni) {
  const degisti = firmaSeciminiDegistir(yeni);
  try {
    const u = new URL(location.href);
    if (u.searchParams.has("firma")) { u.searchParams.delete("firma"); history.replaceState(null, "", u.toString()); }
  } catch (e) { /* file:// ya da eski tarayıcı: parametre kalır, kod aynı olduğu için pencere yeniden açılmaz */ }
  if (degisti) location.reload();
  return degisti;
}
// Ekranda görünen ad: girilen kod; elle (Gelişmiş) bağlanıldıysa proje kimliği.
function firmaGorunenAdi() {
  const f = firmaSecimiOku();
  return (f && (f.demo ? "demo" : f.kod || firmaRefi(f.url))) || "—";
}
// Seçimsiz cihazın açılış ekranı (100 AtolyeERP kapısı). ?firma=KOD varsa kod dolu gelir.
function FirmaGirisEkrani() {
  return <FirmaPenceresi tamEkran kodBaslangic={adresFirmaParametresi()} onKapat={() => {}} />;
}
function adresFirmaParametresi() {
  try { return new URLSearchParams(location.search).get("firma") || ""; } catch (e) { return ""; }
}

function FirmaPenceresi({ onKapat, kodBaslangic = "", tamEkran = false }) {
  const [kod, setKodHam] = useState(FIRMA_PENCERE_DURUMU.kod !== null ? FIRMA_PENCERE_DURUMU.kod : kodBaslangic);
  const setKod = (d) => { FIRMA_PENCERE_DURUMU.kod = d; setKodHam(d); };
  const [gelismis, setGelismis] = useState(false);
  const [adres, setAdres] = useState("");
  const [anahtar, setAnahtar] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState(null);
  // Bekleyen kayıt ancak BAŞKA projeye geçişi engeller; ilk seçimde (tam ekran) proje henüz bilinmiyor — kontrol
  // `firmaSeciminiDegistir`de, hedef proje belli olunca yapılır ve sebep hata kutusunda görünür.
  const engel = tamEkran || firmaKoduNormal(kod) === "demo" ? null : firmaDegisimEngeli();

  async function uygula(demo = false) {
    setBekliyor(true); setHata(null);
    try {
      let f;
      if (demo === true) {
        f = DEMO_FIRMA;
      } else if (gelismis) {
        f = { kod: firmaKoduNormal(kod), url: adres.trim().replace(/\/+$/, ""), anahtar: anahtar.trim() };
        if (!firmaAdresiGecerli(f.url)) throw new Error("Adres https://<proje>.supabase.co biçiminde olmalı");
        const sorun = firmaAnahtariSorunu(f.anahtar);
        if (sorun) throw new Error(sorun);
      } else if (firmaKoduNormal(kod) === "demo") {
        f = DEMO_FIRMA;
      } else {
        f = await firmaKoduCoz(kod);
        if (!f) throw new Error("Bu kodla kayıtlı firma bulunamadı — kodu kontrol edin");
        if (!firmaBaglantisiGecerli(f)) throw new Error("Firma kaydı bozuk — yöneticinize başvurun");
      }
      if (!f.demo) await firmaBaglantisiniDene(f);
      // Bekleyen kayıt engeli burada (hedef proje belli olunca): aynı projeye seçim serbest, başka projeye yasak.
      if (!firmaDegistirVeYenile(f)) { setBekliyor(false); onKapat(); }
    } catch (e) {
      setBekliyor(false);
      const m = String((e && e.message) || e);
      // Engel metni zaten üstteki kutuda; aynısını ikinci kez yazmak yerine kısa sonuç — ama SONUÇSUZ bırakmamak şart
      // (v1.645.3: hata gizlenince "Bağlan" tepkisiz görünüyordu).
      setHata(m === engel ? "Geçilemedi — önce yukarıdaki gönderilmemiş kayıt buluta gitmeli." : m);
    }
  }

  return (
    <div data-firma-penceresi="1" onClick={tamEkran ? undefined : onKapat}
      style={{ position: "fixed", inset: 0, background: tamEkran ? "var(--erp-panel-2, #f4f1ec)" : "rgba(0,0,0,.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--erp-panel, #ffffff)", color: "var(--erp-text, #1f1f1f)", borderRadius: "var(--erp-r-lg, 12px)", padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.25)", width: 400, maxWidth: "100%", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{tamEkran ? "Atölye ERP — Firma kodu" : "Firma seç"}</div>
        <div style={{ fontSize: 12, color: "var(--erp-text-2, #555555)", marginBottom: 14 }}>
          {tamEkran ? null : <>Şu an: <b data-firma-aktif="1">{firmaGorunenAdi()}</b>. </>}
          Firma kodunu size uygulamayı kuran kişi verir. Bu cihazda bir kez sorulur.
          {tamEkran ? <> Kodunuz yoksa <b>Demoyu dene</b>: örnek verilerle dolu bir atölye, yalnız bu cihazda.</> : null}
        </div>
        {engel ? (
          <div data-firma-engel="1" style={{ fontSize: 12, color: "var(--erp-warn, #b3261e)", background: "var(--erp-orange-bg, #fdeee4)", borderRadius: "var(--erp-r-md, 8px)", padding: "8px 10px", marginBottom: 12 }}>{engel}</div>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          <Field label="Firma kodu">
            <input data-firma-kodu="1" value={kod} onChange={(e) => setKod(e.target.value)} style={inputStyle} autoFocus
              onKeyDown={(e) => e.key === "Enter" && !bekliyor && !engel && uygula()} placeholder="örn. ozderi" />
          </Field>
          <button type="button" className="btn-ghost" style={{ justifySelf: "start", fontSize: 12, padding: "2px 6px" }} onClick={() => setGelismis(!gelismis)}>
            {gelismis ? "▾" : "▸"} Gelişmiş: sunucu adresi ve anahtar
          </button>
          {gelismis ? (
            <>
              <Field label="Supabase proje adresi">
                <input data-firma-adres="1" value={adres} onChange={(e) => setAdres(e.target.value)} style={inputStyle} placeholder="https://xxxx.supabase.co" />
              </Field>
              <Field label="Publishable anahtar (gizli anahtar DEĞİL)">
                <input data-firma-anahtar="1" value={anahtar} onChange={(e) => setAnahtar(e.target.value)} style={inputStyle} placeholder="sb_publishable_…" />
              </Field>
            </>
          ) : null}
        </div>
        {/* Engel kutusundaki metnin aynısı hata olarak geldiyse ikinci kez yazılmaz. */}
        {hata ? (
          <div data-firma-hata="1" style={{ marginTop: 12, fontSize: 12, color: "var(--erp-warn, #b3261e)", background: "var(--erp-orange-bg, #fdeee4)", borderRadius: "var(--erp-r-md, 8px)", padding: "8px 10px" }}>{hata}</div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" data-firma-uygula="1" disabled={bekliyor || (!gelismis && firmaKoduNormal(kod).length < 3)} onClick={() => uygula()}>
            {bekliyor ? "Kontrol ediliyor…" : "Bağlan"}
          </button>
          {tamEkran ? null : <button type="button" className="btn-ghost" onClick={onKapat}>Vazgeç</button>}
          {tamEkran ? (
            <button type="button" className="btn-ghost" data-demo-dene="1" disabled={bekliyor} style={{ marginLeft: "auto" }}
              onClick={() => { setKod("demo"); setGelismis(false); setTimeout(() => uygula(true), 0); }}>
              Demoyu dene
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Giriş ekranlarının ve Tanımlar'ın altındaki satır: hangi firmadasın + Değiştir. `?firma=KOD` ile açıldıysa ve kod
// bugünkünden farklıysa pencere kodla dolu kendiliğinden açılır.
// PENCERE DURUMU BİLEŞEN DIŞINDA (v1.645.4): giriş ekranı ve Tanımlar, bulut okuması bitince yeniden kuruluyor;
// pencerenin açık/kapalı bilgisi ve yazılan kod bileşen içinde tutulunca pencere kendiliğinden kapanıyor, kod
// kayboluyor, o an basılan "Bağlan" boşa gidiyordu. Sayfa boyunca tek değer — yeniden kurulan satır kaldığı yerden açar.
const FIRMA_PENCERE_DURUMU = { acik: null, kod: null };
function FirmaSatiri({ kucuk = false }) {
  const parametre = adresFirmaParametresi();
  const farkliParametre = !!parametre && firmaKoduNormal(parametre) !== (AKTIF_FIRMA.kod || "");
  const [acik, setAcikHam] = useState(FIRMA_PENCERE_DURUMU.acik === null ? farkliParametre : FIRMA_PENCERE_DURUMU.acik);
  const setAcik = (d) => { FIRMA_PENCERE_DURUMU.acik = d; if (!d) FIRMA_PENCERE_DURUMU.kod = null; setAcikHam(d); };
  return (
    <>
      <div data-firma-satiri="1" style={{ fontSize: kucuk ? 11 : 12, color: "var(--erp-text-3, #888888)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span>Firma: <b>{firmaGorunenAdi()}</b></span>
        <button type="button" className="btn-ghost" data-firma-degistir="1" style={{ padding: "1px 6px", fontSize: kucuk ? 11 : 12 }} onClick={() => setAcik(true)}>Değiştir</button>
      </div>
      {acik ? <FirmaPenceresi kodBaslangic={farkliParametre ? parametre : ""} onKapat={() => setAcik(false)} /> : null}
    </>
  );
}

// YENİ FİRMA KURULUM DOSYASI (v1.642.0): çalışan veritabanının yapısını (tablo, kural, tetikleyici, yetki) tek SQL
// dosyası olarak indirir — yeni firmanın boş Supabase projesinde bir kez çalıştırılır. Sunucu tarafı
// `kurulum-betigi.sql` (bir kez kurulur); yalnız Yönetici çağırabilir (sunucu reddeder, mesajı burada görünür).
function KurulumDosyasiDugmesi() {
  const [durum, setDurum] = useState(null);   // null | "bekliyor" | { hata } | { tamam }
  async function indir() {
    setDurum("bekliyor");
    try {
      const metin = await supabaseIstek("rpc/kurulum_betigi", { method: "POST", body: "{}" });
      if (typeof metin !== "string" || !/create table/i.test(metin)) throw new Error("Sunucudan boş yanıt geldi");
      const blob = new Blob([metin], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atolye-kurulum-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDurum({ tamam: true });
    } catch (e) {
      const m = String((e && e.message) || e);
      setDurum({ hata: /404|PGRST202|kurulum_betigi/.test(m) && !/Yönetici/.test(m)
        ? "Sunucuda kurulum fonksiyonu yok — önce kurulum-betigi.sql'i bu projede (Supabase › SQL Editor) bir kez çalıştırın."
        : m });
    }
  }
  return (
    <div style={{ marginBottom: 12, fontSize: 12, color: "var(--erp-text-2, #555555)" }}>
      <button type="button" className="btn-ghost" data-kurulum-indir="1" disabled={durum === "bekliyor"} onClick={indir} style={{ fontSize: 12 }}>
        {durum === "bekliyor" ? "Hazırlanıyor…" : "Yeni firma kurulum dosyasını indir (.sql)"}
      </button>
      <span style={{ marginLeft: 8, color: "var(--erp-text-3, #888888)" }}>Yalnız Yönetici · veri içermez, yalnız tablo ve kurallar</span>
      {durum && durum.hata ? <div data-kurulum-hata="1" style={{ marginTop: 6, color: "var(--erp-warn, #b3261e)" }}>{durum.hata}</div> : null}
      {durum && durum.tamam ? <div style={{ marginTop: 6, color: "var(--erp-ok, #2F6B4F)" }}>İndirildi — yeni firmanın boş projesinde SQL Editor'da çalıştırın.</div> : null}
    </div>
  );
}
