// SENARYO — BULUT GİRİŞİ NEDEN OLMADI (kullanıcı, 11 Eylül).
//
//   "Kullanıcı açtım ama yerel bağlantı diyor yine."
//
// Supabase'de hesap açılmıştı ama giriş yerel şifreye düşüyordu ve sebep hiçbir yerde görünmüyordu
// (yalnız konsolda; telefonda konsol yok). Ölçülen: Supabase'in cevabı ekranda okunur dille ve
// denenen e-postayla birlikte görünüyor mu. Supabase ağ isteği sahte cevapla karşılanıyor.
//
// v1.445.0: YEREL ŞİFRE YEDEĞİ KALDIRILDI. Bulut reddedince artık içeri GİRİLMİYOR (kayıtta düz
// metin şifre olsa bile) — giriş ekranında kalınıyor, sebep kalıcı kutuda (`data-giris-hatasi`).
// Eskiden bu senaryo "yerel şifreyle girildi" kartını ölçüyordu; o kart artık hiç açılmamalı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function girisDene(authCevabi) {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({
    ...tanimlar,
    girisAktifMi: true,
    kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "Mahmut", sifre: "gizli123", rol: "Yönetici", yetkiler: {} }],
  });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  let denenenEposta = null;
  await sayfa.route("**/auth/v1/token**", async (route) => {
    try { denenenEposta = JSON.parse(route.request().postData() || "{}").email || null; } catch (e) { /* */ }
    await route.fulfill({ status: authCevabi.status, contentType: "application/json", body: JSON.stringify(authCevabi.govde) });
  });
  await sayfa.waitForTimeout(2500);

  await sayfa.locator('input:not([type="password"])').first().fill("Mahmut");
  await sayfa.locator('input[type="password"]').first().fill("gizli123");
  await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
  await sayfa.waitForTimeout(1500);

  const durum = () => sayfa.evaluate(() => {
    const kart = document.querySelector("[data-bulut-giris-ayrinti]");
    const hata = document.querySelector("[data-giris-hatasi]");
    return {
      girisEkraninda: !!document.querySelector("[data-giris-ekrani]"),
      girisHatasi: hata ? hata.innerText.replace(/\s+/g, " ").trim() : null,
      rozet: !!document.querySelector("[data-yerel-giris]"),
      kart: kart ? kart.innerText.replace(/\s+/g, " ").trim() : null,
    };
  });
  const girisSonrasi = await durum();

  let kapatinca = null;
  let rozeteDokununca = null;
  if (girisSonrasi.kart) {
    await sayfa.locator("[data-bulut-giris-ayrinti] button").first().click();
    await sayfa.waitForTimeout(300);
    kapatinca = (await durum()).kart;
    // Rozet modül başlık şeridinde; Ana Sayfa'da o şerit yok. Kart bu yüzden girişte kendiliğinden
    // açılıyor — giriş Ana Sayfa'ya düşüyor ve rozet orada görünmüyor.
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(500);
    await sayfa.locator("[data-yerel-giris]").first().click();
    await sayfa.waitForTimeout(300);
    rozeteDokununca = !!(await durum()).kart;
  }
  await tarayici.close();
  return { hatalar, denenenEposta, girisSonrasi, kapatinca, rozeteDokununca };
}

async function calistir() {
  return {
    onaylanmamis: await girisDene({ status: 400, govde: { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" } }),
    sifreTutmuyor: await girisDene({ status: 400, govde: { error: "invalid_grant", error_description: "Invalid login credentials" } }),
    bulutBasarili: await girisDene({ status: 200, govde: { access_token: "a", refresh_token: "r", expires_in: 3600, user: { email: "mahmut@atolye.local" } } }),
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
