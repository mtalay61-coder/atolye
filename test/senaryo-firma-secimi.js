// SENARYO — ÇOKLU FİRMA (v1.642.0): Tanımlar'da firma satırı, kodla firma seçimi (rehber + bağlantı denemesi),
// sonra sayfa yeniden açılınca isteklerin YENİ projeye gitmesi; ?firma= bağlantısının giriş ekranında pencereyi
// kodla açması; bekleyen kayıt varken değişimin engellenmesi; gizli anahtarın reddi.
const crypto = require("crypto");
const { uygulamaAc, modulAc, bekle } = require("./ortak.js");
const YENI_URL = "https://abcdefghij12.supabase.co";
const YENI_ANAHTAR = "sb_publishable_DENEMEANAHTARI_1";
const ozet = crypto.createHash("sha256").update("atolye-firma:deneme").digest("hex");
const ozetAna = crypto.createHash("sha256").update("atolye-firma:nds").digest("hex");
const ANA = { url: "https://mqdgucoomgqcvhvgixbl.supabase.co", anahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2" };
const rehberRotasi = async (sayfa) => {
  await sayfa.route("**/firmalar.json**", (r) => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ surum: 1, firmalar: { [ozet]: { url: YENI_URL, anahtar: YENI_ANAHTAR }, [ozetAna]: ANA } }) }));
  await sayfa.route("**/rest/v1/rpc/kurulum_betigi", (r) => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify("-- Atölye ERP — yeni firma kurulum betiği\nbegin;\ncreate table if not exists public.tanimlar (id text);\ncommit;\n") }));
  await sayfa.route("**/auth/v1/settings", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
};
const tohum = { "tanimlar:data": JSON.stringify({ girisAktifMi: false, renkler: [], bedenler: [] }) };

(async () => {
  const sonuc = { hatalar: [] };
  // 1) Tanımlar'dan kodla firma seç.
  {
    const { tarayici, sayfa } = await uygulamaAc(tohum, { hataYaz: false, onceRota: rehberRotasi });
    sayfa.on("pageerror", (e) => sonuc.hatalar.push(e.message.split("\n")[0]));
    await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
    await bekle(600);
    // Bulut bölümü "Yedek & Bulut" sekmesinde.
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yedek & Bulut" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await bekle(400);
    sonuc.satir = await sayfa.evaluate(() => { const s = document.querySelector("[data-firma-satiri]"); return s ? s.innerText.replace(/\s+/g, " ").trim() : null; });
    // Kurulum dosyası indirilir (Yönetici; sunucu yanıtı taklit).
    const [indirme] = await Promise.all([
      sayfa.waitForEvent("download", { timeout: 10000 }).catch(() => null),
      sayfa.click("[data-kurulum-indir]"),
    ]);
    sonuc.kurulumDosyasi = indirme ? { ad: /^atolye-kurulum-\d{4}-\d{2}-\d{2}\.sql$/.test(indirme.suggestedFilename()),
      icerik: /create table if not exists public\.tanimlar/.test(require("fs").readFileSync(await indirme.path(), "utf8")) } : null;
    // Test ortamında bulut yazmaları düşüyor ve bekleyen deftere giriyor — engel doğru çalışıyor; burada temizlenir.
    await sayfa.evaluate(() => !!(localStorage.getItem("bekleyen:yazma") || localStorage.getItem("bekleyen:kayitlar")));
    await sayfa.evaluate(() => { localStorage.removeItem("bekleyen:yazma"); localStorage.removeItem("bekleyen:kayitlar"); });
    await sayfa.click("[data-firma-satiri] [data-firma-degistir]");
    await sayfa.fill("[data-firma-kodu]", "Deneme");
    // Yeniden yükleme: test kabuğu uygulamayı elle çiziyor; yüklemeden sonra yeniden çizilir.
    const yuklendi = sayfa.waitForEvent("load", { timeout: 8000 }).catch(() => null);
    await sayfa.click("[data-firma-uygula]");
    if (!(await yuklendi)) sonuc.hatalar.push("yeniden yüklenmedi: " + await sayfa.evaluate(() => (document.querySelector("[data-firma-hata]") || {}).textContent || "-"));
    sonuc.secim = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("firma:secim") || "null"));
    const istekler = [];
    sayfa.on("request", (r) => { if (/supabase\.co\/rest/.test(r.url())) istekler.push(new URL(r.url()).host); });
    await sayfa.evaluate(() => window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App)));
    await bekle(2500);
    sonuc.yeniProjeyeGidiyor = istekler.length > 0 && istekler.every((h) => h === "abcdefghij12.supabase.co");
    await tarayici.close();
  }
  // 2) ?firma= bağlantısı giriş ekranında pencereyi kodla açar; bekleyen kayıt varsa engel.
  {
    const girisli = { "tanimlar:data": JSON.stringify({ girisAktifMi: true, kullanicilar: [{ id: "k1", ad: "M", kullaniciAdi: "mahmut", rol: "Yönetici" }] }) };
    const yol = "file://" + require("path").join(__dirname, "test.html") + "?firma=deneme";
    const { tarayici, sayfa } = await uygulamaAc(girisli, { hataYaz: false, adres: yol, onceRota: async (s) => {
      await rehberRotasi(s);
      await s.addInitScript(() => localStorage.setItem("bekleyen:yazma", JSON.stringify({ "stok:items": { tablo: "urunler" } })));
    } });
    await bekle(1500);
    sonuc.baglanti = await sayfa.evaluate(() => ({
      pencere: !!document.querySelector("[data-firma-penceresi]"),
      kod: (document.querySelector("[data-firma-kodu]") || {}).value || "",
      engel: !!document.querySelector("[data-firma-engel]"),
    }));
    // Bekleyen kayıt varken BAŞKA projeye geçiş reddedilir (sebep hata kutusunda), seçim değişmez.
    await sayfa.click("[data-firma-uygula]");
    await bekle(800);
    sonuc.baglanti.baskaProjeyeEngel = await sayfa.evaluate(() => ({
      hata: /gönderilmemiş/.test(((document.querySelector("[data-firma-hata]") || document.querySelector("[data-firma-engel]")) || {}).textContent || ""),
      tekKez: document.querySelectorAll("[data-firma-penceresi] [data-firma-hata], [data-firma-penceresi] [data-firma-engel]").length === 1,
      secimAyni: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) === "nds",
    }));
    // 3) Engel kalkınca gizli anahtar elle girilirse reddedilir.
    await sayfa.evaluate(() => { localStorage.removeItem("bekleyen:yazma"); localStorage.removeItem("bekleyen:kayitlar"); });
    await sayfa.click("[data-firma-penceresi] button.btn-ghost:has-text('Vazgeç')");
    await sayfa.click("[data-firma-degistir]");
    await sayfa.click("text=Gelişmiş: sunucu adresi ve anahtar");
    await sayfa.fill("[data-firma-adres]", YENI_URL);
    await sayfa.fill("[data-firma-anahtar]", "sb_secret_GIZLIANAHTAR123");
    await sayfa.click("[data-firma-uygula]");
    await bekle(500);
    sonuc.gizliAnahtar = await sayfa.evaluate(() => ({
      hata: /GİZLİ/.test((document.querySelector("[data-firma-hata]") || {}).textContent || ""),
      secimDegismedi: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) === "nds",
    }));
    await tarayici.close();
  }
  // 4) FİRMA KAPISI (v1.643.0): seçimsiz cihazda yalnız firma kodu ekranı; ana firmanın eski cihazı (bekleyen kaydı var)
  // kendi kodunu girince seçim yazılır — aynı proje, bekleyen kayıt engel değil, veri taşınmaz.
  {
    const yol = "file://" + require("path").join(__dirname, "test.html") + "?firma=NDS";
    const { tarayici, sayfa } = await uygulamaAc(tohum, { hataYaz: false, adres: yol, firmaSecili: false, yuklemeyiBekle: false, onceRota: async (s) => {
      await rehberRotasi(s);
      await s.addInitScript(() => {
        if (!localStorage.getItem("__kuruldu")) {
          localStorage.setItem("__kuruldu", "1");
          localStorage.setItem("bekleyen:yazma", JSON.stringify({ "stok:items": { tablo: "urunler" } }));
          localStorage.setItem("atolye:oturum", "ESKI-OTURUM");
        }
      });
    } });
    await bekle(1200);
    sonuc.kapi = await sayfa.evaluate(() => ({
      kodEkrani: !!document.querySelector("[data-firma-penceresi]"),
      vazgecYok: ![...document.querySelectorAll("[data-firma-penceresi] button")].some((b) => b.textContent.trim() === "Vazgeç"),
      uygulamaYok: !document.querySelector("[data-nav]"),
      kod: (document.querySelector("[data-firma-kodu]") || {}).value || "",
    }));
    const yuklendi = sayfa.waitForEvent("load", { timeout: 8000 }).catch(() => null);
    await sayfa.click("[data-firma-uygula]");
    if (!(await yuklendi)) sonuc.hatalar.push("kapı: yeniden yüklenmedi: " + await sayfa.evaluate(() => (document.querySelector("[data-firma-hata]") || {}).textContent || "-"));
    sonuc.kapi.sonra = await sayfa.evaluate(() => ({
      secim: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) || null,
      bekleyenYerinde: !!localStorage.getItem("bekleyen:yazma"),
      oturumYerinde: localStorage.getItem("atolye:oturum") === "ESKI-OTURUM",
      sakliKutuYok: !Object.keys(localStorage).some((a) => a.startsWith("firma:sakli:")),
    }));
    await tarayici.close();
  }
  console.log(JSON.stringify(sonuc, null, 1));
})();
