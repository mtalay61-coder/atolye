// ================= KAMERA OKUYUCU (v1.411.0 → JSX + teyit/bekleme/ses v1.614.0) =================
//
// 236'dan (derlenmiş React.createElement hâli) JSX olarak taşındı; Depo Okut, Depo Sevkiyat ve sipariş formu
// aynı bileşeni kullanıyor.
//
// KAMERA: önce tarayıcının `BarcodeDetector`ı (Android Chrome — hızlı); yoksa (iPhone Safari) kendi Code128
// çözücümüz (`kameraKaresiCoz`, 077-barkod). Sonuç `onKod`a gider; tanımayı çağıran yapar.
//
// v1.614.0 (kullanıcı, fuar: "kamera ile okuyunca daha hassas ve bekleme süresi olsun. Okuyunca ses çıkarsın daha
// belirgin"):
//   • TEYİT: bir kod ancak ART ARDA İKİ KAREDE aynı okunursa kabul edilir (KAMERA_TEYIT_SAYISI). Hareketli
//     görüntüde tek karelik yanlış okuma (yarım etiket, yan barkod) artık kalem eklemiyor.
//   • BEKLEME: kabul edilen okumadan sonra KAMERA_BEKLEME_MS boyunca hiçbir kod okunmaz; ekranda yeşil
//     "Okundu ✓" ve geri sayım çubuğu. Telefonu bir sonraki etikete götürmeye zaman kalır, aynı koli iki kez
//     girmez. Aynı kod bekleme bittikten sonra da KAMERA_AYNI_KOD_MS içinde tekrar gelirse yok sayılır
//     (aynı etiketin önünde durulursa) — asorti katı için kamerayı etiketten çekip tekrar göstermek yeter.
//   • NETLİK: daha yüksek çözünürlük istenir (1920×1080), cihaz destekliyorsa sürekli odak; yerleşik çözücü
//     kareyi 1280 px'e kadar işler (eski 960).
//   • SES: `okutmaSesi` (077) — başarıda yüksek iki ton, hatada alçak uzun ton. Sesi ÇAĞIRAN çalar (kaydın
//     başarılı olup olmadığını o bilir); `onKod` true/false dönerse burada da çalınır (sessiz çağıranlar için
//     `sesli` prop'u). Kısa titreşim de sürüyor.
const KAMERA_TEYIT_SAYISI = 2;
const KAMERA_BEKLEME_MS = 1800;
const KAMERA_AYNI_KOD_MS = 4000;

function KameraOkuyucu({ onKod, sesli = false }) {
  const videoRef = useRef(null);
  const tuvalRef = useRef(null);
  const akisRef = useRef(null);
  const sonRef = useRef({ kod: "", zaman: 0 });
  const adayRef = useRef({ kod: "", sayi: 0 });
  const beklemeRef = useRef(0);
  const onKodRef = useRef(onKod);
  onKodRef.current = onKod;
  const [durum, setDurum] = useState("kapali"); // kapali | aciliyor | acik | hata
  const [hata, setHata] = useState("");
  const [yontem, setYontem] = useState("");
  // Bekleme göstergesi: { kod, bitis } — ekranda yeşil şerit + geri sayım.
  const [bekleme, setBekleme] = useState(null);
  const kapat = useCallback(() => {
    if (akisRef.current) {
      akisRef.current.getTracks().forEach((t) => t.stop());
      akisRef.current = null;
    }
    setDurum("kapali");
  }, []);
  useEffect(() => () => { if (akisRef.current) akisRef.current.getTracks().forEach((t) => t.stop()); }, []);
  // GÜVENLİ ADRES ŞARTI (22 Eylül, v1.412.0): indirilen HTML Chrome'da `content://` adresiyle açılınca tarayıcı
  // kamera iznini SORMADAN reddediyor. Kamera yalnız https (ya da file://) sayfada çalışır.
  const guvensizAdres = () => {
    const p = window.location.protocol;
    return p === "content:" || (window.isSecureContext === false && p !== "file:");
  };
  const ADRES_MESAJI = (window.location.protocol === "content:"
    ? "Uygulama indirilen dosyadan açılmış (content://). "
    : "Uygulama güvenli olmayan bir adresten açılmış (" + window.location.protocol + "//). ") + "Telefon tarayıcıları " +
    "kamerayı yalnız https adresinden açılan sayfaya verir. Uygulamayı kendi bağlantısından (baslat.html / " +
    "Storage adresi, https://…) açın; o bağlantıyı ana ekrana ekleyebilirsiniz.";
  const ac = async () => {
    setHata("");
    // SES KİLİDİ: tarayıcı sesi yalnız bir dokunuştan sonra açar — kamerayı açan dokunuş bunu da açsın.
    okutmaSesiHazirla();
    if (guvensizAdres() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDurum("hata"); setHata(ADRES_MESAJI); return;
    }
    setDurum("aciliyor");
    try {
      const akis = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
      });
      akisRef.current = akis;
      // Sürekli odak (destekleyen Android'de): etiket yaklaşıp uzaklaştıkça netlik korunur.
      try {
        const iz = akis.getVideoTracks()[0];
        const yet = iz && iz.getCapabilities ? iz.getCapabilities() : {};
        if (yet && Array.isArray(yet.focusMode) && yet.focusMode.includes("continuous")) {
          await iz.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        }
      } catch (e) { /* odak ayarı desteklenmiyor — varsayılanla devam */ }
      const v = videoRef.current;
      v.srcObject = akis;
      await v.play();
      setDurum("acik");
    } catch (e) {
      setDurum("hata");
      setHata(/NotAllowed|Permission/i.test(String(e && e.name))
        ? (window.location.protocol !== "https:" && window.location.protocol !== "file:"
          ? ADRES_MESAJI
          : "Kamera izni verilmedi. Adres çubuğundaki kilit simgesi > İzinler > Kamera: İzin ver, sonra tekrar deneyin.")
        : `Kamera açılamadı: ${(e && e.message) || e}`);
    }
  };

  // Okuma döngüsü — kamera açıkken saniyede ~6 kare; bekleme süresince kare işlenmez.
  useEffect(() => {
    if (durum !== "acik") return undefined;
    let dedektor = null;
    let iptal = false;
    (async () => {
      try {
        if (typeof window.BarcodeDetector !== "undefined") {
          const bicimler = await window.BarcodeDetector.getSupportedFormats();
          if (bicimler.includes("code_128")) dedektor = new window.BarcodeDetector({ formats: ["code_128"] });
        }
      } catch (e) { dedektor = null; }
      if (!iptal) setYontem(dedektor ? "cihaz" : "yerlesik");
    })();
    let mesgul = false;
    const z = setInterval(async () => {
      const v = videoRef.current;
      if (mesgul || !v || v.readyState < 2 || !v.videoWidth) return;
      if (Date.now() < beklemeRef.current) return;
      mesgul = true;
      try {
        let kod = null;
        if (dedektor) {
          const bulunan = await dedektor.detect(v);
          if (bulunan && bulunan[0]) kod = bulunan[0].rawValue;
        } else {
          const t = tuvalRef.current;
          const g = Math.min(1280, v.videoWidth);
          const y = Math.round((v.videoHeight / v.videoWidth) * g);
          t.width = g; t.height = y;
          const c = t.getContext("2d", { willReadFrequently: true });
          c.drawImage(v, 0, 0, g, y);
          kod = kameraKaresiCoz(c.getImageData(0, 0, g, y));
        }
        if (!kod) { adayRef.current = { kod: "", sayi: 0 }; }
        else {
          // TEYİT: aynı kod art arda N karede.
          adayRef.current = adayRef.current.kod === kod ? { kod, sayi: adayRef.current.sayi + 1 } : { kod, sayi: 1 };
          const simdi = Date.now();
          const ayniKodYeni = kod === sonRef.current.kod && simdi - sonRef.current.zaman < KAMERA_AYNI_KOD_MS;
          if (adayRef.current.sayi >= KAMERA_TEYIT_SAYISI && !ayniKodYeni) {
            adayRef.current = { kod: "", sayi: 0 };
            sonRef.current = { kod, zaman: simdi };
            beklemeRef.current = simdi + KAMERA_BEKLEME_MS;
            setBekleme({ kod, bitis: simdi + KAMERA_BEKLEME_MS });
            if (navigator.vibrate) navigator.vibrate(60);
            const sonuc = onKodRef.current(kod);
            if (sesli && typeof sonuc === "boolean") okutmaSesi(sonuc);
          } else if (ayniKodYeni) {
            // Etiket hâlâ kamerada: süreyi uzat, bırakınca sayılsın.
            sonRef.current = { kod, zaman: simdi };
          }
        }
      } catch (e) { /* tek karelik hata — sonraki kare */ }
      mesgul = false;
    }, 160);
    return () => { iptal = true; clearInterval(z); };
  }, [durum, sesli]);

  // Bekleme göstergesini süre bitince kaldır.
  useEffect(() => {
    if (!bekleme) return undefined;
    const t = setTimeout(() => setBekleme(null), Math.max(0, bekleme.bitis - Date.now()));
    return () => clearTimeout(t);
  }, [bekleme]);

  const acikMi = durum === "acik" || durum === "aciliyor";
  return (
    <div data-kamera-okuyucu="1" style={{ display: "grid", gap: 6 }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 520, aspectRatio: "16 / 9", background: "#1C1A17",
        borderRadius: "var(--erp-r-md)", overflow: "hidden", display: acikMi ? "block" : "none" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "50%", height: 2, background: bekleme ? "rgba(40,160,80,0.95)" : "rgba(220,60,40,0.85)" }} />
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "30%", bottom: "30%", border: `2px solid ${bekleme ? "rgba(40,160,80,0.95)" : "rgba(255,255,255,0.6)"}`, borderRadius: 6 }} />
        {bekleme && (
          <div data-kamera-bekleme="1" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "6px 10px", background: "rgba(30,120,60,0.9)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            Okundu ✓ {bekleme.kod} — sıradaki etikete geçin
            <div style={{ height: 3, background: "rgba(255,255,255,0.35)", marginTop: 4, borderRadius: 2, overflow: "hidden" }}>
              <div key={bekleme.bitis} className="kamera-bekleme-cubugu" style={{ height: "100%", background: "#fff", animation: `kameraBekleme ${KAMERA_BEKLEME_MS}ms linear forwards` }} />
            </div>
          </div>
        )}
        <style>{"@keyframes kameraBekleme { from { width: 100%; } to { width: 0%; } }"}</style>
      </div>
      <canvas ref={tuvalRef} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {acikMi ? (
          <button type="button" className="btn-ghost" data-kamera-kapat="1" onClick={kapat}><X size={14} /> Kamerayı kapat</button>
        ) : (
          <button type="button" className="btn-primary" data-kamera-ac="1" onClick={ac}><Camera size={14} /> Kamerayla okut</button>
        )}
        {durum === "acik" && (
          <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
            Barkodu kırmızı çizgiye yatay tutun{yontem === "yerlesik" ? " · yerleşik okuyucu" : yontem === "cihaz" ? " · cihaz okuyucusu" : ""}
          </span>
        )}
      </div>
      {hata && <div data-kamera-hata="1" style={{ fontSize: 12, color: "var(--erp-danger)" }}>{hata}</div>}
    </div>
  );
}
