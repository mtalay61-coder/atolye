// ================= TANIMLARI SUNUCUDAN TAZELE + CİHAZ KİMLİĞİ (v1.744.16) =================
//
// Kullanıcı (11 Kasım, günlük 20:19 "Bilinmeyen — Tanımlar bulutla birleştirildi: başka cihazda eklenen 81 öğe korundu"):
// giriş ekranında sabahtan bekleyen bir cihaz akşam bağlantı gelince sabahki tanım kopyasıyla kendiliğinden yazdı. Kurallar:
//   · otomatik tanım yazmadan önce (100 `otomatikTanimYaz`) ve bekleyen tanım kaydını yeniden göndermeden önce tanımlar BAYATSA
//     (030 `tanimlarTazeMi`: bağlantı geri geldi / uzun süre arka plan / son okuma 5 dk'dan eski) sunucudan okunur;
//   · OKUMA BAŞARISIZSA YAZMA YOK (null döner, çağıran vazgeçer);
//   · okunan hâl ekrandakiyle UZLAŞTIRILIR (089 `tanimlarUzlastir`, taban üstünden üç yönlü): bu cihazdaki gerçek kullanıcı
//     değişikliği kaybolmaz, başka cihazın eklediği / değiştirdiği / sildiği öğe korunur — eski kopya bütünüyle gönderilmez.
// Bu dosya App'e bağlı değil: `mevcut` verilir, uzlaşmış hâl döner; ekranı App günceller.

// Döner: { tanimlar, ozet } | null (okunamadı). Okuma başarılıysa taban = sunucu hâli, tazelik işareti yenilenir.
async function tanimlariSunucudanTazele(mevcut) {
  if (!supabaseAcikMi()) return { tanimlar: mevcut, ozet: null };
  let bulut;
  try {
    const r = await supabaseIstek("tanimlar?id=eq.tekil&select=veri");
    bulut = Array.isArray(r) && r[0] ? r[0].veri : null;
  } catch (e) {
    // SINAMA ANAHTARI (`__tanimTazelemeSerbest`, test/ortak.js): senaryolar ağsız koşar, sunucu hiç okunamaz — otomatik tanım
    // tamamlamalarını (işçilik kartı, logo, kod onarımı) ölçen eski senaryolar için okuma "fark yok" sayılır. Yazma yine
    // tekilYaz'ın okumasına takılır (deftere düşer). Kapının kendisini ölçen senaryo (yazma-kapisi) anahtarsız koşar.
    if (typeof window !== "undefined" && window.__tanimTazelemeSerbest) return { tanimlar: mevcut, ozet: null };
    console.warn("Tanımlar sunucudan tazelenemedi — otomatik tanım yazması yapılmadı:", e);
    return null;
  }
  // TABAN YOKSA (açılışta sunucu okunamamış, saklı taban da yok) iki yönlü birleştirmede AYNI KİMLİKTE bu cihaz kazanıyordu:
  // eski kopya, başka cihazın değiştirdiği adı / kodu geri alırdı. Taban kurulur (`tabansizTaban`):
  //   · bekleyen tanım kaydı YOK → bu cihazda gönderilmemiş gerçek değişiklik yok (internetsiz kayıt girilmez; düşen kullanıcı
  //     yazması deftere ve saklı tabana iner) → taban = yerel hâl: sunucunun her farkı (ekleme / değişiklik / silme) uygulanır;
  //   · bekleyen VAR ama tabanı saklanmamış (açılış göçü sunucu okunamazken düştü, ya da eski sürümün kaydı) → yalnız bu
  //     cihazda olan öğeler "bu cihazın eklediği" sayılır ve kalır; ortak kimlikte sunucu hâli esas (eski kopya geri almaz).
  let taban = tekilTabanOku("tanimlar");
  if (taban === undefined && bulut) {
    const bekleyenVar = typeof bekleyenYazmalariOku === "function" && !!bekleyenYazmalariOku()["tanimlar:data"];
    taban = bekleyenVar ? tabansizTaban(mevcut, bulut) : mevcut;
  }
  const u = tanimlarUzlastir(mevcut, bulut, taban, tanimSilinenleriOku());
  if (bulut) tekilTabanAyarla("tanimlar", bulut);
  tanimlarOkundu();
  return { tanimlar: u.tanimlar, ozet: u };
}

// Yerel hâlden, kimlikli listelerde yalnız sunucuda da OLAN öğeleri tutan taban (yukarıdaki ikinci durum). Kimliksiz alanlar
// (firma bilgileri, ayarlar) yerel hâlden: onlarda bu cihaz kazanmaz, sunucu farkı uygulanır.
function tabansizTaban(yerel, bulut) {
  const t = { ...(yerel || {}) };
  Object.keys(t).forEach((alan) => {
    const y = t[alan]; const b = (bulut || {})[alan];
    if (!Array.isArray(y) || !y.length || !y.every((x) => x && typeof x === "object" && x.id)) return;
    const bulutta = new Set((Array.isArray(b) ? b : []).filter((x) => x && x.id).map((x) => x.id));
    t[alan] = y.filter((x) => bulutta.has(x.id));
  });
  return t;
}

// CİHAZ KİMLİĞİ (günlük için): bu tarayıcıya bir kez rastgele verilir (`cihaz:kimlik`, yerel). Kişisel veri / oturum anahtarı
// DEĞİL — yalnız "aynı cihaz mı?" sorusuna cevap; kullanıcı girmeden (giriş ekranında) yapılan işin hangi cihazdan geldiği görünsün.
const CIHAZ_KIMLIK_ANAHTARI = "cihaz:kimlik";
let _cihazKimligi = null;
function cihazKimligi() {
  if (_cihazKimligi) return _cihazKimligi;
  try {
    let k = window.localStorage.getItem(CIHAZ_KIMLIK_ANAHTARI);
    if (!k) { k = `cihaz-${Math.random().toString(36).slice(2, 8)}`; window.localStorage.setItem(CIHAZ_KIMLIK_ANAHTARI, k); }
    _cihazKimligi = k;
  } catch (e) { _cihazKimligi = "cihaz-bilinmiyor"; }
  return _cihazKimligi;
}
// Kısa cihaz tarifi (tarayıcı ailesi + dokunmatik mi): "Chrome · dokunmatik". Kimlik bilgisi değil.
function cihazTarifi() {
  try {
    const ua = String(navigator.userAgent || "");
    const tarayici = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "tarayıcı";
    const tur = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? "tablet" : /Mobile|iPhone|Android/i.test(ua) ? "telefon" : "bilgisayar";
    return `${tarayici} · ${tur}`;
  } catch (e) { return ""; }
}
