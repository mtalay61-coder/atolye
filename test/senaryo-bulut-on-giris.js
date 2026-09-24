// SENARYO — 2. AŞAMA: VERİTABANI ANAHTARLA OKUNAMIYORSA BULUT ÖN GİRİŞİ (12 Eylül).
//
// rls-kimlik.sql'den sonra anon anahtarlı istek 401/403 alır. Ölçülen:
//   1. Açılışta REST 403 → yerel kopyaya DÜŞÜLMEZ (tohum yerelde dolu ama ekranda liste yok),
//      ilk kurulum ekranı ÇIKMAZ, bulut giriş ekranı gelir.
//   2. Yanlış şifre → sebep ekranda (Supabase'in mesajı Türkçeleşmiş).
//   3. Doğru giriş → veri jetonla yeniden okunur, kullanıcı Tanımlar kaydıyla eşlenir, ikinci
//      giriş ekranı sorulmaz; üst şeritte "Yerel giriş" rozeti YOK.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlarBulut = { ...JSON.parse(TOHUM["tanimlar:data"]), girisAktifMi: true,
    kullanicilar: [{ id: "k1", ad: "Mahmut Yönetici", kullaniciAdi: "Mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true }] };
  const istekler = [];
  const onceRota = async (sayfa) => {
  await sayfa.route("**/rest/v1/**", (route) => {
    const istek = route.request();
    const yetki = istek.headers()["authorization"] || "";
    const jetonlu = /Bearer jeton-/.test(yetki);
    istekler.push({ yol: istek.url().split("/rest/v1/")[1].split("?")[0], jetonlu });
    if (!jetonlu) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "42501", message: "permission denied for table urunler" }) });
    const yol = istek.url().split("/rest/v1/")[1].split("?")[0];
    if (istek.method() !== "GET") return route.fulfill({ status: 204, body: "" });
    const govde = yol === "tanimlar" ? [{ id: "tekil", veri: tanimlarBulut }] : [];
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(govde) });
  });
  await sayfa.route("**/auth/v1/token**", (route) => {
    const govde = JSON.parse(route.request().postData() || "{}");
    if (govde.password === "dogru123") {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ access_token: "jeton-a", refresh_token: "r", expires_in: 3600, user: { email: govde.email } }) });
    }
    return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) });
  });
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3000);

  const acilis = await sayfa.evaluate(() => ({
    bulutGirisEkrani: !!document.querySelector("[data-bulut-giris-ekrani]"),
    ilkKurulumYok: !/İlk Kurulum|ilk kullanıcı/i.test(document.body.innerText),
    yerelListeYok: !document.body.innerText.includes("Stok Yönetimi"),
  }));

  // 2. Yanlış şifre.
  await sayfa.locator("[data-bulut-giris-ekrani] input").first().fill("Mahmut");
  await sayfa.locator('[data-bulut-giris-ekrani] input[type="password"]').fill("yanlis");
  await sayfa.locator('[data-bulut-giris-ekrani] button').first().click();
  await sayfa.waitForTimeout(800);
  const yanlisSifre = await sayfa.evaluate(() => (document.querySelector("[data-bulut-giris-hata]") || {}).textContent || null);

  // 3. Doğru şifre → veri yeniden yüklenir, doğrudan içeri.
  await sayfa.locator('[data-bulut-giris-ekrani] input[type="password"]').fill("dogru123");
  await sayfa.locator('[data-bulut-giris-ekrani] button').first().click();
  await sayfa.waitForTimeout(3500);
  const girisSonrasi = await sayfa.evaluate(() => ({
    bulutGirisEkraniKapandi: !document.querySelector("[data-bulut-giris-ekrani]"),
    ikinciGirisEkraniYok: !/^Giriş Yap$/m.test([...document.querySelectorAll("button")].map((b) => b.textContent.trim()).join("\n")),
    icerde: /Anasayfa/.test(document.body.innerText),
    yerelRozetYok: !document.querySelector("[data-yerel-giris]"),
  }));
  const jetonluOkuma = istekler.some((i) => i.yol === "tanimlar" && i.jetonlu);
  const anahtarlaOkumaReddedildi = istekler.some((i) => !i.jetonlu);

  await tarayici.close();
  return { hatalar, acilis, yanlisSifre, girisSonrasi, jetonluOkuma, anahtarlaOkumaReddedildi };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
