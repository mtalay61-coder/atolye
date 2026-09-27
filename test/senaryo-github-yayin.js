// SENARYO — UYGULAMADAN GITHUB'A YAYINLAMA (22 Eylül, v1.414.0 / v1.417.0 / v1.418.0)
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "GitHub'a yüklemenin kolay yolu yok mu? … uygulamanın içine dosyayı yükleyecek yer
// yapsak ve bizim uygulamadan yüklesek?" → Tanımlar > Yayın (`137-github-yayin.jsx`): HTML seç →
// Yayınla; sürümlü HTML ve `surum.json` TEK COMMIT'te depoya gider (Git Data API).
// `api.github.com` bu senaryoda ROTA İLE TAKLİT ediliyor — GERÇEK istek gitmez.
//
// Ölçülenler:
//   1. Başarılı yayın: istek SIRASI ref → commit → 2 blob → tree → commit → ref PATCH (dal EN SON
//      oynar, yarım yayın olmaz); tek commit, ağaçta iki yol, `surum.json` içeriği (sürüm + GitHub
//      Pages adresi), sürüm no dosya adından, sonuç şeridi, uygulama içi sürüm kaydı (`surum:data`).
//   2. Anahtar YALNIZ bu cihazda: `localStorage` + yerel depo `github:token`; `tanimlar:data`da ve
//      başka hiçbir depo anahtarında YOK (buluta gitseydi veritabanını gören depoya yazabilirdi).
//   3. Kalıcılık (v1.418.0): localStorage silinip ekran kapatılıp açılınca anahtar yerel depodan
//      geri geliyor — rozet "kayitli", kutu dolu. (Sayfa yenileme testte yok: test deposu bellekte.)
//   4. Dosya içerikten doğrulanıyor (v1.417.0): HTML olmayan dosya reddedilir, GitHub'a 0 istek;
//      adında sürüm olmayan HTML'de sürüm no `<title>`dan okunur.
//   5. Hata yolları: 401 (geçersiz anahtar) ve 404 (yanlış dal) anlaşılır mesaj verir, İLK istekte
//      durur, sonuç şeridi çıkmaz, sürüm kaydı değişmez.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));

  // GITHUB TAKLİDİ: her istek günlüğe yazılıyor (yöntem + depo köküne göre yol + gövde). Hata yolları
  // İSTEĞİN KENDİSİNDEN seçiliyor: eski anahtar → 401, "yanlis-dal" → 404. Böylece rota durumsuz.
  const istekler = [];
  await sayfa.route("https://api.github.com/**", async (rota) => {
    const r = rota.request();
    const yontem = r.method();
    if (yontem === "OPTIONS") return rota.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const yol = new URL(r.url()).pathname;
    let govde = null;
    try { govde = r.postData() ? JSON.parse(r.postData()) : null; } catch (e) { govde = "?"; }
    istekler.push({ yontem, yol: yol.replace(/^\/repos\/mtalay61-coder\/atolye/, ""), govde, yetki: (r.headers()["authorization"] || "") });
    const yanit = (status, v) => rota.fulfill({ status, contentType: "application/json",
      headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(v) });
    if ((r.headers()["authorization"] || "") === "Bearer github_pat_ESKI") return yanit(401, { message: "Bad credentials" });
    if (/yanlis-dal/.test(yol)) return yanit(404, { message: "Not Found" });
    if (/\/git\/ref\/heads\//.test(yol) && yontem === "GET") return yanit(200, { object: { sha: "eski-commit" } });
    if (/\/git\/commits\/[\w-]+$/.test(yol)) return yanit(200, { sha: "eski-commit", tree: { sha: "eski-agac" } });
    if (/\/git\/blobs$/.test(yol)) return yanit(200, { sha: `blob-${istekler.filter((x) => /blobs$/.test(x.yol)).length}` });
    if (/\/git\/trees$/.test(yol)) return yanit(200, { sha: "yeni-agac" });
    if (/\/git\/commits$/.test(yol)) return yanit(200, { sha: "yeni-commit" });
    if (/\/git\/refs\/heads\//.test(yol) && yontem === "PATCH") return yanit(200, { object: { sha: "yeni-commit" } });
    return yanit(500, { message: "beklenmeyen istek" });
  });
  await sayfa.waitForTimeout(2200);

  const toastOku = () => sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); return t ? t.textContent.trim() : null; });
  const toastKapat = () => sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); if (t) t.click(); });
  const sekme = async (k) => {
    await sayfa.evaluate((a) => { const b = document.querySelector(`[data-tanim-sekme="${a}"]`); if (b) b.click(); }, k);
    await sayfa.waitForTimeout(400);
  };
  const ekran = () => sayfa.evaluate(() => ({
    rozet: (document.querySelector("[data-gh-token-durum]") || {}).getAttribute ? document.querySelector("[data-gh-token-durum]").getAttribute("data-gh-token-durum") : null,
    kutuDolu: !!((document.querySelector("[data-gh-token]") || {}).value),
    surum: (document.querySelector("[data-gh-surum]") || {}).value || "",
    sonuc: (() => { const e = document.querySelector("[data-gh-sonuc]"); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; })(),
  }));
  const dosyaSec = async (name, icerik, mimeType = "text/html") => {
    await sayfa.locator("[data-gh-dosya]").first().setInputFiles({ name, mimeType, buffer: Buffer.from(icerik, "utf8") });
    await sayfa.waitForTimeout(400);
  };
  // Türkçe harfli başlık: surum.json'un TextEncoder'la base64'e çevrilmesi ayrıca sınanmış olur.
  const HTML = (no) => `<!doctype html><html><head><title>Atölye ERP ${no}</title></head><body>çğışöü</body></html>`;

  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sekme("yayin");
  const formVar = await sayfa.evaluate(() => !!document.querySelector("[data-github-yayin]"));
  const ilkEkran = await ekran();

  // 1) ANAHTARI KAYDET + BAŞARILI YAYIN
  await sayfa.locator("[data-gh-token]").first().fill("github_pat_TEST");
  await sayfa.locator("[data-gh-token-kaydet]").first().click();
  await sayfa.waitForTimeout(400);
  const anahtarToast = await toastOku();
  await toastKapat();
  await dosyaSec("atolye-erp-v9.8.7.html", HTML("9.8.7"));
  const secimSonrasi = await ekran();
  await sayfa.locator("[data-gh-yayinla]").first().click();
  await sayfa.waitForTimeout(2000);
  const yayinToast = await toastOku();
  await toastKapat();
  const yayinEkrani = await ekran();
  const agacIstegi = istekler.find((x) => /trees$/.test(x.yol));
  const commitIstegi = istekler.find((x) => /commits$/.test(x.yol) && x.yontem === "POST");
  const bloblar = istekler.filter((x) => /blobs$/.test(x.yol));
  const surumJsonBlob = agacIstegi && bloblar[agacIstegi.govde.tree.findIndex((g) => g.path === "surum.json")];
  const yazilanKayit = await depoOku(sayfa, "surum:data");
  const basarili = {
    sira: istekler.map((x) => `${x.yontem} ${x.yol}`),
    hepsiAnahtarli: istekler.every((x) => x.yetki === "Bearer github_pat_TEST"),
    blobSayisi: bloblar.length,
    bloblarBase64: bloblar.every((b) => b.govde && b.govde.encoding === "base64"),
    htmlIcerigiAyni: bloblar[0] ? Buffer.from(bloblar[0].govde.content, "base64").toString("utf8") === HTML("9.8.7") : false,
    agac: agacIstegi && { taban: agacIstegi.govde.base_tree, yollar: agacIstegi.govde.tree.map((g) => `${g.path} ${g.mode} ${g.type} ${g.sha}`) },
    commit: commitIstegi && commitIstegi.govde,
    commitSayisi: istekler.filter((x) => /commits$/.test(x.yol) && x.yontem === "POST").length,
    dalGuncelleme: (istekler.filter((x) => x.yontem === "PATCH").map((x) => x.govde)),
    surumJson: surumJsonBlob ? JSON.parse(Buffer.from(surumJsonBlob.govde.content, "base64").toString("utf8")) : null,
    yazilanKayit: yazilanKayit && { surum: yazilanKayit.surum, url: yazilanKayit.url, not: yazilanKayit.not, zamanVar: !!yazilanKayit.zaman },
    toast: yayinToast,
    ekran: yayinEkrani,
  };

  // 2) ANAHTAR NEREDE? — yalnız bu cihazda.
  const anahtarYeri = await sayfa.evaluate(() => ({
    localStorage: window.localStorage.getItem("github:token"),
    yerelDepo: window.__depo["github:token"] || null,
    anahtarGecenDepoKayitlari: Object.keys(window.__depo).filter((k) => String(window.__depo[k]).includes("github_pat_TEST")).sort(),
    tanimlardaVar: String(window.__depo["tanimlar:data"] || "").includes("github_pat"),
  }));

  // 3) KALICILIK — localStorage silinir, ekran kapatılıp açılır (bileşen yeniden kurulur).
  await sayfa.evaluate(() => window.localStorage.removeItem("github:token"));
  await sekme("firma");
  const kapaliyken = await sayfa.evaluate(() => !!document.querySelector("[data-github-yayin]"));
  await sekme("yayin");
  await sayfa.waitForTimeout(400);
  const yenidenAcilinca = { kapaliyken, ...(await ekran()) };

  // 4) İÇERİKTEN DOĞRULAMA
  istekler.length = 0;
  await dosyaSec("yedek.json", JSON.stringify({ stok: [] }), "application/json");
  const htmlDegilToast = await toastOku();
  await toastKapat();
  await sayfa.locator("[data-gh-yayinla]").first().click();
  await sayfa.waitForTimeout(500);
  const dosyasizToast = await toastOku();
  await toastKapat();
  const htmlDegil = { toast: htmlDegilToast, yayinlaDenenince: dosyasizToast, istekSayisi: istekler.length, surum: (await ekran()).surum };
  // Telefon indirirken adı bozabilir: adında sürüm yok → başlıktan.
  await dosyaSec("indirilen (1).html", HTML("1.416.0"));
  const basliktanSurum = (await ekran()).surum;

  // 5) HATA YOLLARI — ilk istekte durmalı, sonuç şeridi çıkmamalı, sürüm kaydı değişmemeli.
  const hataYolu = async () => {
    istekler.length = 0;
    await sayfa.locator("[data-gh-yayinla]").first().click();
    await sayfa.waitForTimeout(1200);
    const t = await toastOku();
    await toastKapat();
    const e = await ekran();
    return { toast: t, istekler: istekler.map((x) => `${x.yontem} ${x.yol}`), sonucSeridi: e.sonuc, surumKaydi: ((await depoOku(sayfa, "surum:data")) || {}).surum || null };
  };
  // 401: kutuya eski anahtar yazılıyor (kaydetmeden — yayın kutudaki değeri kullanır).
  await sayfa.locator("[data-gh-token]").first().fill("github_pat_ESKI");
  const hata401 = await hataYolu();
  // 404: doğru anahtar, yanlış dal (Depo ayarları açılır bölümü).
  await sayfa.locator("[data-gh-token]").first().fill("github_pat_TEST");
  await sayfa.locator('[data-github-yayin] button:has-text("Depo ayarları")').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-gh-ayar="dal"]').first().fill("yanlis-dal");
  await sayfa.waitForTimeout(200);
  const hata404 = await hataYolu();

  await tarayici.close();
  return { hatalar, formVar, ilkEkran, anahtarToast, secimSonrasi, basarili, anahtarYeri, yenidenAcilinca, htmlDegil, basliktanSurum, hata401, hata404 };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
