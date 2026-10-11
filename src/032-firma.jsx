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
  return `Bu cihazda buluta gönderilmemiş ${sayi} kayıt grubu var. Önce internete bağlanıp gönderin; gönderilmemiş kayıt varken firma değiştirilemez (kayıt öteki firmanın bulutuna gidebilirdi).`;
}
// Seçimi değiştirir (sayfayı YENİDEN YÜKLEMEZ — çağıran yükler). `yeni` null ya da varsayılan proje → varsayılan.
// Dönüş: değişti mi. Engel varsa hata fırlatır.
function firmaSeciminiDegistir(yeni, depo = localStorage) {
  const engel = firmaDegisimEngeli();
  if (engel) throw new Error(engel);
  if (yeni && !firmaBaglantisiGecerli(yeni)) throw new Error(firmaAnahtariSorunu(yeni.anahtar) || "Adres geçersiz — https://<proje>.supabase.co olmalı");
  const varsayilanRef = firmaRefi(VARSAYILAN_FIRMA.url);
  const hedef = yeni && firmaRefi(yeni.url) !== varsayilanRef ? yeni : null;
  const eskiRef = firmaRefi(AKTIF_FIRMA.url);
  const yeniRef = hedef ? firmaRefi(hedef.url) : varsayilanRef;
  if (yeniRef === eskiRef) return false;
  const sakli = {};
  for (const a of FIRMAYA_OZEL_ANAHTARLAR) {
    const d = depo.getItem(a);
    if (d !== null) sakli[a] = d;
    depo.removeItem(a);
  }
  depo.setItem(`firma:sakli:${eskiRef}`, JSON.stringify(sakli));
  try {
    const geri = JSON.parse(depo.getItem(`firma:sakli:${yeniRef}`) || "{}") || {};
    // Bekleyen defter GERİ KONMAZ: değişim ancak defter boşken yapılabiliyor, saklanan hâl de boş olmalı; olmayan bir
    // ihtimalde bile eski defteri canlandırmak, gönderilmiş kaydı ikinci kez göndermeye yol açardı.
    for (const [a, d] of Object.entries(geri)) if (!/^bekleyen:/.test(a)) depo.setItem(a, d);
  } catch (e) { /* bozuk saklama kutusu: temiz başlanır */ }
  depo.removeItem(`firma:sakli:${yeniRef}`);
  if (hedef) depo.setItem(FIRMA_SECIM_ANAHTARI, JSON.stringify({ kod: firmaKoduNormal(hedef.kod), url: hedef.url, anahtar: String(hedef.anahtar).trim() }));
  else depo.removeItem(FIRMA_SECIM_ANAHTARI);
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
function adresFirmaParametresi() {
  try { return new URLSearchParams(location.search).get("firma") || ""; } catch (e) { return ""; }
}

function FirmaPenceresi({ onKapat, kodBaslangic = "" }) {
  const [kod, setKod] = useState(kodBaslangic);
  const [gelismis, setGelismis] = useState(false);
  const [adres, setAdres] = useState("");
  const [anahtar, setAnahtar] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState(null);
  const engel = firmaDegisimEngeli();
  const varsayilanda = !firmaSecimiOku();

  async function uygula(hedef) {
    setBekliyor(true); setHata(null);
    try {
      let f = hedef;
      if (f === undefined) {
        if (gelismis) {
          f = { kod: firmaKoduNormal(kod), url: adres.trim().replace(/\/+$/, ""), anahtar: anahtar.trim() };
          if (!firmaAdresiGecerli(f.url)) throw new Error("Adres https://<proje>.supabase.co biçiminde olmalı");
          const sorun = firmaAnahtariSorunu(f.anahtar);
          if (sorun) throw new Error(sorun);
        } else {
          f = await firmaKoduCoz(kod);
          if (!f) throw new Error("Bu kodla kayıtlı firma bulunamadı — kodu kontrol edin");
          if (!firmaBaglantisiGecerli(f)) throw new Error("Firma kaydı bozuk — yöneticinize başvurun");
        }
        await firmaBaglantisiniDene(f);
      }
      if (!firmaDegistirVeYenile(f)) { setBekliyor(false); onKapat(); }
    } catch (e) {
      setBekliyor(false);
      setHata(String((e && e.message) || e));
    }
  }

  return (
    <div data-firma-penceresi="1" onClick={onKapat}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--erp-panel)", borderRadius: "var(--erp-r-lg)", padding: 24, width: 400, maxWidth: "100%", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Firma seç</div>
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 14 }}>
          Şu an: <b data-firma-aktif="1">{AKTIF_FIRMA.kod || (varsayilanda ? "ana firma" : firmaRefi(AKTIF_FIRMA.url))}</b>.
          Firma kodunu size uygulamayı kuran kişi verir.
        </div>
        {engel ? (
          <div data-firma-engel="1" style={{ fontSize: 12, color: "var(--erp-warn)", background: "var(--erp-orange-bg)", borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginBottom: 12 }}>{engel}</div>
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
        {hata ? (
          <div data-firma-hata="1" style={{ marginTop: 12, fontSize: 12, color: "var(--erp-warn)", background: "var(--erp-orange-bg)", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>{hata}</div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" data-firma-uygula="1" disabled={bekliyor || !!engel || (!gelismis && firmaKoduNormal(kod).length < 3)} onClick={() => uygula()}>
            {bekliyor ? "Kontrol ediliyor…" : "Bağlan"}
          </button>
          <button type="button" className="btn-ghost" onClick={onKapat}>Vazgeç</button>
          {!varsayilanda ? (
            <button type="button" className="btn-ghost" data-firma-ana="1" disabled={bekliyor || !!engel} style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => uygula(null)}>Ana firmaya dön</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Giriş ekranlarının ve Tanımlar'ın altındaki satır: hangi firmadasın + Değiştir. `?firma=KOD` ile açıldıysa ve kod
// bugünkünden farklıysa pencere kodla dolu kendiliğinden açılır.
function FirmaSatiri({ kucuk = false }) {
  const parametre = adresFirmaParametresi();
  const farkliParametre = !!parametre && firmaKoduNormal(parametre) !== (AKTIF_FIRMA.kod || "");
  const [acik, setAcik] = useState(farkliParametre);
  const ad = AKTIF_FIRMA.kod || (firmaSecimiOku() ? firmaRefi(AKTIF_FIRMA.url) : "");
  return (
    <>
      <div data-firma-satiri="1" style={{ fontSize: kucuk ? 11 : 12, color: "var(--erp-text-3)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span>Firma: <b>{ad || "ana firma"}</b></span>
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
    <div style={{ marginBottom: 12, fontSize: 12, color: "var(--erp-text-2)" }}>
      <button type="button" className="btn-ghost" data-kurulum-indir="1" disabled={durum === "bekliyor"} onClick={indir} style={{ fontSize: 12 }}>
        {durum === "bekliyor" ? "Hazırlanıyor…" : "Yeni firma kurulum dosyasını indir (.sql)"}
      </button>
      <span style={{ marginLeft: 8, color: "var(--erp-text-3)" }}>Yalnız Yönetici · veri içermez, yalnız tablo ve kurallar</span>
      {durum && durum.hata ? <div data-kurulum-hata="1" style={{ marginTop: 6, color: "var(--erp-warn)" }}>{durum.hata}</div> : null}
      {durum && durum.tamam ? <div style={{ marginTop: 6, color: "var(--erp-ok, #2F6B4F)" }}>İndirildi — yeni firmanın boş projesinde SQL Editor'da çalıştırın.</div> : null}
    </div>
  );
}
