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
// "Bağlan"a bas ve sonucu bekle. Giriş ekranı / Tanımlar bulut okuması bitince bir kez yeniden çiziliyor; pencere tam o
// anda yeniden kurulursa tıklama boşa gidiyordu (kullanıcı için "bir daha bas"; veri riski yok). En çok 3 deneme.
async function baglanVeBekle(sayfa, kosul) {
  for (let i = 0; i < 3; i++) {
    await sayfa.click("[data-firma-uygula]").catch(() => {});
    if (await sayfa.waitForFunction(kosul, null, { timeout: 6000 }).then(() => true).catch(() => false)) return true;
  }
  if (process.env.TESHIS) console.error("TESHIS", await sayfa.evaluate(() => ({ dugme: (document.querySelector("[data-firma-uygula]") || {}).textContent, pencere: !!document.querySelector("[data-firma-penceresi]"), kod: (document.querySelector("[data-firma-kodu]") || {}).value, secim: localStorage.getItem("firma:secim") })));
  return false;
}
const tohum = { "tanimlar:data": JSON.stringify({ girisAktifMi: false, renkler: [], bedenler: [] }) };

(async () => {
  const sonuc = { hatalar: [] };
  // 1) Tanımlar'dan kodla firma seç.
  {
    // Bulut yazmaları başarılı sayılır (GET düşer, yerel tohum kalır): düşen yazma bekleyen deftere girip geçişi
    // engelliyordu — koruma doğru ama bu bölümün konusu değil, ölçüm yarışlı oluyordu.
    const { tarayici, sayfa } = await uygulamaAc(tohum, { hataYaz: false, onceRota: async (s) => {
      // Önce genel kural: Playwright'ta SON eklenen kural önce çalışır — rehber/rpc taklidi onu ezmeli.
      await s.route("**/rest/v1/**", (r) => (r.request().method() === "GET" ? r.abort() : r.fulfill({ status: 200, contentType: "application/json", body: "[]" })));
      await rehberRotasi(s);
    } });
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
    await baglanVeBekle(sayfa, () => /deneme/.test(localStorage.getItem("firma:secim") || "") || !!document.querySelector("[data-firma-hata]"));
    await bekle(1500);
    const kalanHata = await sayfa.evaluate(() => (document.querySelector("[data-firma-hata]") || {}).textContent || "");
    if (kalanHata) sonuc.hatalar.push("geçiş: " + kalanHata);
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
    await baglanVeBekle(sayfa, () => !!document.querySelector("[data-firma-hata]"));
    sonuc.baglanti.baskaProjeyeEngel = await sayfa.evaluate(() => ({
      hata: /gönderilmemiş/.test(((document.querySelector("[data-firma-hata]") || document.querySelector("[data-firma-engel]")) || {}).textContent || ""),
      sonucGorunur: /Geçilemedi/.test((document.querySelector("[data-firma-hata]") || {}).textContent || ""),
      secimAyni: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) === "nds",
    }));
    // 3) Engel kalkınca gizli anahtar elle girilirse reddedilir.
    await sayfa.evaluate(() => { localStorage.removeItem("bekleyen:yazma"); localStorage.removeItem("bekleyen:kayitlar"); });
    await sayfa.click("[data-firma-penceresi] button.btn-ghost:has-text('Vazgeç')");
    await sayfa.click("[data-firma-degistir]");
    await sayfa.click("text=Gelişmiş: sunucu adresi ve anahtar");
    await sayfa.fill("[data-firma-adres]", YENI_URL);
    await sayfa.fill("[data-firma-anahtar]", "sb_secret_GIZLIANAHTAR123");
    await baglanVeBekle(sayfa, () => !!document.querySelector("[data-firma-hata]"));
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
    // Yükleme olayını beklemek yarışlıydı (ölçüm yeniden yüklemeyle çakışıp eski seçimi okuyabiliyordu): sabit bekleme.
    await baglanVeBekle(sayfa, () => /nds/.test(localStorage.getItem("firma:secim") || "") || !!document.querySelector("[data-firma-hata]"));
    await bekle(1500);
    sonuc.kapi.sonra = await sayfa.evaluate(() => ({
      secim: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) || null,
      bekleyenYerinde: !!localStorage.getItem("bekleyen:yazma"),
      oturumYerinde: localStorage.getItem("atolye:oturum") === "ESKI-OTURUM",
      sakliKutuYok: !Object.keys(localStorage).some((a) => a.startsWith("firma:sakli:")),
    }));
    await tarayici.close();
  }
  // 5) v1.645.3 — kullanıcının ekranı: ana firmada (nds) bekleyen kayıt varken ?firma=demo → Bağlan GEÇER; defter ana
  // firmanın saklama kutusuna kalkar (silinmez).
  {
    const girisli = { "tanimlar:data": JSON.stringify({ girisAktifMi: true, kullanicilar: [{ id: "k1", ad: "M", kullaniciAdi: "mahmut", rol: "Yönetici" }] }) };
    const yol = "file://" + require("path").join(__dirname, "test.html") + "?firma=demo";
    const { tarayici, sayfa } = await uygulamaAc(girisli, { hataYaz: false, adres: yol, onceRota: async (s) => {
      await s.addInitScript(() => {
        if (!localStorage.getItem("__kuruldu5")) { localStorage.setItem("__kuruldu5", "1"); localStorage.setItem("bekleyen:yazma", JSON.stringify({ "stok:items": { tablo: "urunler" } })); }
      });
    } });
    await bekle(1500);
    sonuc.demoyaGecis = { engelYok: await sayfa.evaluate(() => !document.querySelector("[data-firma-engel]")) };
    await baglanVeBekle(sayfa, () => /demo/.test(localStorage.getItem("firma:secim") || "") || !!document.querySelector("[data-firma-hata]"));
    await bekle(1500);
    sonuc.demoyaGecis.sonra = await sayfa.evaluate(() => ({
      secim: (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) || null,
      defterOrtada: !!localStorage.getItem("bekleyen:yazma"),
      defterKutuda: /bekleyen:yazma/.test(localStorage.getItem("firma:sakli:mqdgucoomgqcvhvgixbl") || ""),
    }));
    await tarayici.close();
  }
  console.log(JSON.stringify(sonuc, null, 1));
})();
