// SENARYO — YÖNETİCİSİZ LİSTE KİLİDİ (kullanıcı, 13 Eylül: sıfırlama sonrası "Kullanıcı" rolüyle
// eklenen tek kullanıcıyla giriş açıldı, kısıtlı girdi, Tanımlar'a giremediği için düzeltemedi).
// Ölçülen: 1) listede yönetici yokken eklenen ilk kullanıcı Yönetici olur; 2) yöneticisiz listeyle
// giriş açılamaz; 3) yine de yöneticisiz listeyle giriş yapılmışsa giren kişi Yönetici yapılır.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  // Eski veriden kalmış hâl: tek kullanıcı "Kullanıcı" rolünde, giriş açık.
  t["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: true,
    // GİRİŞ ARTIK YALNIZ BULUT (24 Eylül, v1.444.0): kullanıcı bulut hesaplı, auth taklit ediliyor.
    kullanicilar: [{ id: "k1", ad: "Ali", kullaniciAdi: "ali", rol: "Kullanıcı", yetkiler: {}, eposta: "ali@atolye.local", bulutHesabi: true }] });
  const { tarayici, sayfa } = await uygulamaAc(t, {
    hataYaz: false, onceRota: (s) => bulutGirisRotasi(s, { eposta: "ali@atolye.local" }),
  });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.locator('input:not([type="password"])').first().fill("ali");
  await sayfa.locator('input[type="password"]').first().fill("gizli123");
  await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
  await sayfa.waitForTimeout(1800);
  const girisSonrasi = {
    rol: ((await depoOku(sayfa, "tanimlar:data")).kullanicilar || [])[0].rol,
    tanimlarMenude: await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((b) => /Tanımlar/.test(b.textContent) && b.getBoundingClientRect().width > 0)),
  };

  // Yeni veritabanı: kullanıcı yok, giriş pasif → Tanımlar'dan "Kullanıcı" rolüyle ekle → Yönetici olmalı;
  // yöneticisiz listeyle giriş açılamamalı.
  const t2 = { ...TOHUM };
  t2["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: false, kullanicilar: [] });
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  const s2 = ikinci.sayfa;
  s2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const diyaloglar2 = [];
  s2.on("dialog", (d) => { diyaloglar2.push(d.message().split("\n")[0]); d.accept(); });
  await s2.route("**/functions/v1/kullanici", (route) => route.fulfill({ status: 404, body: "{}" }));
  // v1.445.0: giriş kapalıyken bulut oturumu yok → kullanıcı, panelde açılmış hesapla GİRİŞ
  // DENENEREK doğrulanıyor. Önce hesap yok (400), sonra var (200).
  let authKabul = false;
  await s2.route("**/auth/v1/token**", (rota) => (authKabul
    ? rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "j", refresh_token: "r", expires_in: 3600, user: { email: "veli@atolye.local" } }) })
    : rota.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) })));
  await s2.waitForTimeout(2500);
  await s2.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await s2.waitForTimeout(600);
  await s2.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kullanıcılar" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await s2.waitForTimeout(400);
  // Giriş yöneticisiz açılamaz (henüz kullanıcı yok).
  await s2.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Aktif" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await s2.waitForTimeout(500);
  const girisAcilmadi = !((await depoOku(s2, "tanimlar:data")).girisAktifMi);
  await s2.locator('input[placeholder="Ad Soyad"]').fill("Veli");
  await s2.locator('input[placeholder="Kullanıcı adı"]').fill("veli");
  await s2.locator('input[placeholder="Şifre"]').fill("sifre123");
  await s2.evaluate(() => { const b = document.querySelector("[data-kullanici-ekle]"); if (b) b.click(); });
  await s2.waitForTimeout(1200);
  const hesapYokken = {
    kayitlar: ((await depoOku(s2, "tanimlar:data")).kullanicilar || []).length,
    diyalog: diyaloglar2[diyaloglar2.length - 1] || null,
  };
  authKabul = true;   // hesap panelde açıldı; form dolu kaldı, tekrar ekle
  await s2.evaluate(() => { const b = document.querySelector("[data-kullanici-ekle]"); if (b) b.click(); });
  await s2.waitForTimeout(1200);
  const ilkKullanici = ((await depoOku(s2, "tanimlar:data")).kullanicilar || [])
    .map((k) => `${k.ad}:${k.rol}:${k.bulutHesabi ? "bulut" : "yerel"}:${"sifre" in k ? "sifreli" : "sifresiz"}`);
  await ikinci.tarayici.close();
  await tarayici.close();
  return { hatalar, girisSonrasi, girisAcilmadi, hesapYokken, ilkKullanici };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
