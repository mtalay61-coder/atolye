// BULUT GİRİŞİ TAKLİDİ — ORTAK (24 Eylül, v1.444.0)
//
// Yerel şifre yedeği kaldırıldı: giriş artık YALNIZ Supabase üzerinden. Senaryolar da gerçek
// akışı sürmeli. Bu yardımcı, auth isteğini kabul/ret olarak taklit eder; REST okuması bilerek
// başarısız (uygulama yerel tohuma düşsün — boş [] dönmek tohumu silerdi).
async function bulutGirisRotasi(sayfa, { kabul = true, eposta = "mahmut@atolye.local" } = {}) {
  await sayfa.route("**/auth/v1/token**", (rota) => {
    if (!kabul) {
      return rota.fulfill({ status: 400, contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) });
    }
    rota.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ access_token: "jeton", refresh_token: "yenileme", expires_in: 3600, user: { email: eposta } }) });
  });
  await sayfa.route("**/rest/v1/**", (rota) =>
    (rota.request().method() === "GET" ? rota.abort() : rota.fulfill({ status: 200, contentType: "application/json", body: "[]" })));
}

async function girisYap(sayfa, kullaniciAdi, sifre) {
  await sayfa.locator("[data-giris-ekrani] input").first().fill(kullaniciAdi);
  await sayfa.locator('[data-giris-ekrani] input[type="password"]').first().fill(sifre);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("[data-giris-ekrani] button")].find((x) => /Giriş Yap/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);
}

module.exports = { bulutGirisRotasi, girisYap };
