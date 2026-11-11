// SENARYO — YAZMA KAPISI + OTOMATİK TANIM YAZMASI (v1.744.16).
//
// Kullanıcı (11 Kasım, günlük 20:19 "Bilinmeyen — Tanımlar bulutla birleştirildi: başka cihazda eklenen 81 öğe korundu"):
// giriş ekranında sabahtan bekleyen cihaz, akşam bağlantı gelince sabahki tanım kopyasıyla kendiliğinden yazdı. İstenen:
// oturum kapalıyken otomatik yazma / yeniden gönderme YOK; kuyruktayken oturum kapanırsa gönderim durur; uzun bekleme ve
// bağlantı geri geldikten sonra otomatik tanım yazmasından önce sunucu OKUNUR, okunamazsa yazma yok; başka cihazın eklediği ve
// değiştirdiği tanımlar korunur; günlükte cihaz, sürüm, tetikleyen ve okunur özet.
//
// Sahte sunucu yalnız `tanimlar` tablosunu tutar (GET: kip "hata" → ağ hatası, "bekle" → elle bırakılana kadar asılı, "ok" →
// sunucu hâli; POST → sunucu hâli olur). Günlük yazmaları (POST gunluk) ayrıca toplanır.
//   A) İşçilik gider kartı tamamlama (tohumda kartı olmayan Kesim prosesi): açılışta sunucu okunamıyor → tanım YAZILMAZ,
//      günlüğe "yapılmadı" düşer. Bağlantı geri gelir (online) → önce GET sonra POST; giden gövdede başka cihazın eklediği
//      "Lacivert" ve DEĞİŞTİRDİĞİ "Siyah Süet" var, işçilik kartı eklendi. Uzun bekleme → tazelik düşer.
//   B) Oturum kapalı: giriş ekranında, defterde bekleyen tanım kaydı varken 3 sn → sunucuya HİÇ yazma yok. Giriş → bekleyen
//      kayıt uzlaştırılarak gider: bu cihazın "Yerel Mor"u + başka cihazın "Lacivert"i ve "Siyah Süet"i.
//   C) Gönderim sırasında çıkış: tanım okuması asılıyken yeniden gönderim başlar, kullanıcı çıkar, okuma döner → POST YOK,
//      kayıt defterde kalır.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { bulutGirisRotasi, girisYap } = require("./giris-yardimci.js");

function sahteSunucu(ilk) {
  const D = { mod: "hata", bulut: ilk, sira: [], postlar: [], gunluk: [], digerYazma: [], birak: null };
  const kur = async (sayfa) => {
    await sayfa.route("**/rest/v1/tanimlar*", async (r) => {
      const q = r.request();
      if (q.method() === "GET") {
        if (D.mod === "bekle") await new Promise((res) => { D.birak = res; });
        if (D.mod === "hata") { D.sira.push("GET✗"); return r.abort(); }
        D.sira.push("GET");
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(D.bulut ? [{ veri: D.bulut }] : []) });
      }
      D.sira.push(q.method());
      try { const v = JSON.parse(q.postData())[0].veri; D.postlar.push(v); D.bulut = v; } catch (e) { /* */ }
      return r.fulfill({ status: 201, body: "" });
    });
    await sayfa.route("**/rest/v1/gunluk*", (r) => {
      try { (JSON.parse(r.request().postData() || "[]") || []).forEach((g) => D.gunluk.push(g)); } catch (e) { /* */ }
      return r.fulfill({ status: 201, body: "" });
    });
    sayfa.on("request", (q) => {
      const u = q.url();
      if (/\/rest\/v1\//.test(u) && !/^(GET|HEAD|OPTIONS)$/.test(q.method()) && !/\/rest\/v1\/(tanimlar|gunluk)/.test(u)) D.digerYazma.push(u.replace(/^.*\/rest\/v1\//, "").replace(/\?.*$/, ""));
    });
  };
  return { D, kur };
}
const adlar = (t) => ((t && t.renkler) || []).map((r) => r.ad).sort();
const gunlukOzet = (g) => {
  const a = g.ayrinti || {};
  return { mesaj: String(g.eylem || "").replace(/\d+ öğe/g, "N öğe"), cihazVar: /^cihaz-/.test(a.cihaz || ""), surumVar: !!a.surum, tetikleyen: a.tetikleyen || null };
};

async function calistir() {
  const hatalar = [];
  const tan0 = JSON.parse(TOHUM["tanimlar:data"]);
  // BAŞKA CİHAZIN SUNUCUDAKİ HÂLİ: "Lacivert" ekledi, "Siyah"ın adını "Siyah Süet" yaptı.
  const baskaCihaz = (t) => ({ ...t, renkler: [...t.renkler.map((r) => (r.id === "r1" ? { ...r, ad: "Siyah Süet" } : r)), { id: "r-lac", ad: "Lacivert" }] });

  // ───────── A) işçilik gider kartı: okunamazsa yazma yok; bağlantı gelince tazele + yaz; uzun bekleme ─────────
  const A = sahteSunucu(baskaCihaz(tan0));
  let { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota: A.kur, tanimTazelemeKapisi: true });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const aAcilis = {
    tanimYazmasi: A.D.sira.filter((x) => x !== "GET✗"),
    yerelIscilikKarti: await sayfa.evaluate(() => (JSON.parse(window.__depo["tanimlar:data"] || "{}").giderKartlari || []).length),
    gunluk: A.D.gunluk.filter((g) => /Otomatik tanım yazması yapılmadı/.test(g.eylem || "")).map(gunlukOzet).slice(0, 1),
  };
  A.D.mod = "ok"; A.D.sira.length = 0;
  await sayfa.evaluate(() => window.dispatchEvent(new Event("online")));
  await sayfa.waitForTimeout(2500);
  const giden = A.D.postlar[A.D.postlar.length - 1] || {};
  const aBaglanti = {
    sira: [...new Set(A.D.sira)].length ? A.D.sira.slice(0, 2) : [],
    ilkPostOncesiGet: A.D.sira.indexOf("GET") >= 0 && A.D.sira.indexOf("GET") < A.D.sira.indexOf("POST"),
    gidenRenkler: adlar(giden),
    gidenIscilikKarti: (giden.giderKartlari || []).some((k) => /işçiliği/i.test(k.ad || "")),
    // Tazelemeyi hangi işin yaptığı (işçilik kartı ya da bekleyen kaydı yeniden gönderme) sıraya bağlı: yalnız kaydın
    // biçimi ölçülür — okunur özet ("renkler N"), cihaz kimliği, sürüm, tetikleyen yol; öğe ADI geçmez.
    gunluk: (() => {
      const g = A.D.gunluk.find((x) => /^Tanımlar (sunucudan tazelendi|sunucuyla uzlaştırıldı)/.test(x.eylem || ""));
      if (!g) return null;
      const a = g.ayrinti || {};
      return { okunurOzet: /renkler \d+/.test(g.eylem), adGecmiyor: !/Lacivert|Süet/.test(JSON.stringify(g)), cihazVar: /^cihaz-/.test(a.cihaz || ""), surumVar: !!a.surum, tetikleyenVar: !!a.tetikleyen };
    })(),
  };
  // Uzun bekleme: eşik 0 → gizlen / görün → tazelik düşer.
  await sayfa.evaluate(() => {
    window.__uzunBeklemeMs = 0;
    let gizli = true;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => gizli });
    document.dispatchEvent(new Event("visibilitychange"));
    gizli = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const aUzun = await sayfa.evaluate(() => ({ taze: window.__erp.tanimlarTazeMi(), sebep: window.__erp.tanimBayatlikSebebi() }));
  // Eksik yükleme kilidi: tanım yazması da, stok yazması da sunucuya gitmez; bekleyen deftere de düşmez.
  A.D.sira.length = 0; const aDiger = A.D.digerYazma.length;
  const aKilit = await sayfa.evaluate(async () => {
    const E = window.__erp; E.VERI_KILIDI.aktif = true;
    const once = Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")).length;
    await E.tekilYaz("tanimlar:data", "tanimlar", JSON.parse(window.__depo["tanimlar:data"]), { tetikleyen: "sınama" });
    const r = await E.tabloYaz("stok:items", "urunler", JSON.parse(window.__depo["stok:items"]).map((u) => ({ ...u, ad: u.ad + " (kilit)" })));
    const sonra = Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")).length;
    E.VERI_KILIDI.aktif = false;
    return { tabloYaz: r && r.hata, defterArtti: sonra > once };
  });
  aKilit.sunucuyaGiden = [...A.D.sira, ...A.D.digerYazma.slice(aDiger)];
  await tarayici.close();

  // ───────── B) oturum kapalı → yazma yok; giriş → bekleyen kayıt uzlaştırılarak ─────────
  const tanB = { ...tan0, girisAktifMi: true,
    kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true }] };
  const tB = { ...TOHUM };
  // Bu cihaz sabah (oturum açıkken, sunucu = tanB) "Yerel Mor"u ekledi; yazma düştü → defter + saklı taban.
  const yerelB = { ...tanB, renkler: [...tanB.renkler, { id: "r-mor", ad: "Yerel Mor" }] };
  tB["tanimlar:data"] = JSON.stringify(yerelB);
  const B = sahteSunucu(baskaCihaz(tanB));
  B.D.mod = "ok";
  const bRota = async (s) => {
    await bulutGirisRotasi(s);
    await B.kur(s);
    await s.addInitScript((taban) => {
      localStorage.setItem("bekleyen:yazma", JSON.stringify({ "tanimlar:data": { tablo: "tanimlar", zaman: "2026-11-11T08:00:00.000Z", deneme: 1, hata: "ağ" } }));
      localStorage.setItem("tanimlar:bekleyen-taban", JSON.stringify(taban));
    }, tanB);
  };
  ({ tarayici, sayfa } = await uygulamaAc(tB, { hataYaz: false, onceRota: bRota, tanimTazelemeKapisi: true }));
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3000);
  const bKapali = {
    girisEkrani: await sayfa.evaluate(() => !!document.querySelector("[data-giris-ekrani]")),
    tanimYazmasi: B.D.sira.filter((x) => x !== "GET" && x !== "GET✗"),
    digerYazma: B.D.digerYazma.filter((y) => !/^rpc\/site_/.test(y)),   // salt-okur site işlevleri muaf
    defterde: await sayfa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"))),
  };
  B.D.sira.length = 0;
  await girisYap(sayfa, "mahmut", "gizli");
  await sayfa.waitForTimeout(2500);
  const gidenB = B.D.postlar[B.D.postlar.length - 1] || {};
  const bGiris = {
    sira: B.D.sira.slice(0, 2),
    gidenRenkler: adlar(gidenB),
    defterde: await sayfa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"))),
    sakliTaban: await sayfa.evaluate(() => localStorage.getItem("tanimlar:bekleyen-taban") !== null),
  };

  // ───────── C) gönderim sırasında çıkış ─────────
  // Defterde yeniden tanım kaydı olsun (okunamayan yazma), sonra okuma asılıyken yeniden gönderim + çıkış.
  B.D.mod = "hata";
  await sayfa.evaluate(() => window.__erp.tekilYaz("tanimlar:data", "tanimlar", JSON.parse(window.__depo["tanimlar:data"]), { tetikleyen: "sınama" }));
  await sayfa.waitForTimeout(500);
  const cDefter = await sayfa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")));
  B.D.mod = "bekle"; B.D.sira.length = 0; const postOnce = B.D.postlar.length;
  await sayfa.evaluate(() => window.dispatchEvent(new Event("online")));   // bekleyen kayıtlar yeniden gönderilir
  await sayfa.waitForTimeout(700);
  const okumaAsili = !!B.D.birak;
  await sayfa.evaluate(() => { const b = document.querySelector('[title="Çıkış Yap"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  B.D.mod = "ok"; if (B.D.birak) B.D.birak();
  await sayfa.waitForTimeout(1500);
  const cCikis = {
    okumaAsiliydi: okumaAsili,
    cikistaGirisEkrani: await sayfa.evaluate(() => !!document.querySelector("[data-giris-ekrani]")),
    postYok: B.D.postlar.length === postOnce,
    defterde: await sayfa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"))),
  };
  await tarayici.close();
  return { aAcilis, aBaglanti, aUzun, aKilit, bKapali, bGiris, cDefter, cCikis, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
