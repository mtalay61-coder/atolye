// SENARYO — "GITHUB'A YAYINLA" KALDIRILDI (v1.636.0; bölüm v1.414.0'da eklenmişti).
// Kullanıcı: "buna gerek kaldı mı? GitHub anahtarı hariç gerek yok gibi" → "evet". Yayın artık Claude Code PR'ı ile;
// depoya yazma yetkili anahtarın tarayıcıda durması gereksiz risk.
// Kurulum: bu cihazda eski bölümden kalmış anahtar ve ayar (localStorage `github:token`, `github:ayar`).
// Ölçülen: açılışta ikisi de silinir; Tanımlar'da "Yayın" sekmesi ve GitHub formu yok; Sürüm geçmişi duruyor.
const { uygulamaAc, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // Eski anahtarı yaz ve yeniden yükle: temizlik açılışta çalışıyor.
  await sayfa.evaluate(() => { localStorage.setItem("github:token", "github_pat_ESKI"); localStorage.setItem("github:ayar", "{\"dal\":\"main\"}"); });
  await sayfa.reload(); await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  await sayfa.waitForTimeout(2500);
  const sonuc = {};
  sonuc.anahtarSilindi = await sayfa.evaluate(() => localStorage.getItem("github:token") === null && localStorage.getItem("github:ayar") === null);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await sayfa.waitForTimeout(700);
  sonuc.tanimlar = await sayfa.evaluate(() => ({
    yayinSekmesi: !!document.querySelector('[data-tanim-sekme="yayin"]'),
    githubFormu: !!document.querySelector("[data-github-yayin], [data-gh-token]"),
    surumGecmisiSekmesi: !!document.querySelector('[data-tanim-sekme="surumGecmisi"]'),
  }));
  await sayfa.locator('[data-tanim-sekme="surumGecmisi"]').first().click(); await sayfa.waitForTimeout(400);
  sonuc.surumGecmisiAcildi = await sayfa.evaluate(() => !!document.querySelector("[data-surum-gecmisi]"));
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
