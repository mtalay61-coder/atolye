// SENARYO — HAREKETSİZLİKTE OTOMATİK ÇIKIŞ (11 Ekim, v1.641.0).
// Kullanıcı (güvenlik paketi): ortak bilgisayarda açık unutulan oturum kapansın. Tanımlar'da 1 saat; son etkinlik 2 saat
// önce → giriş yapılır yapılmaz çıkış (toast + giriş ekranı). Son etkinlik taze ise oturum kalır.
// Not: test altyapısı localStorage'ı açılışta temizliyor; anahtar sayfa yüklendikten sonra yazılır.
const { uygulamaAc } = require("./ortak.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({
    ...tanimlar, girisAktifMi: true,
    firmaBilgileri: { ...(tanimlar.firmaBilgileri || {}), otomatikCikisSaat: 1 },
    kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", sifre: "gizli123", rol: "Yönetici", yetkiler: {} }],
  });
  const eski = Date.now() - 2 * 3600000;
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate((z) => localStorage.setItem("oturum:sonEtkinlik", String(z)), eski);
  const girisYap = async () => {
    await sayfa.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
    await sayfa.locator('input:not([type="password"]):visible').first().fill("mahmut");
    await sayfa.locator('input[type="password"]').first().fill("gizli123");
    await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
    await sayfa.waitForTimeout(1500);
  };
  await girisYap();
  const eskiEtkinlik = await sayfa.evaluate(() => ({
    girisEkrani: !![...document.querySelectorAll('input[type="password"]')].find((x) => x.getBoundingClientRect().width > 0),
    toast: (document.querySelector("[data-toast]") || {}).textContent || "",
    anahtarSilindi: !localStorage.getItem("oturum:sonEtkinlik"),
  }));
  // Taze etkinlik: yeniden giriş → oturum kalır, anahtar yazılır.
  let ikinciGiris = true;
  try { await girisYap(); } catch (e) { ikinciGiris = false; }
  const taze = await sayfa.evaluate(() => ({
    girisEkrani: !![...document.querySelectorAll('input[type="password"]')].find((x) => x.getBoundingClientRect().width > 0),
    anahtarVar: !!localStorage.getItem("oturum:sonEtkinlik"),
  }));
  await tarayici.close();
  return { hatalar, ikinciGiris, eskiEtkinlik: { ...eskiEtkinlik, toast: eskiEtkinlik.toast.replace(/\s+/g, " ").trim() }, taze };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
