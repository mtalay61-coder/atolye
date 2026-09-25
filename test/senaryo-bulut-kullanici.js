// SENARYO — BULUT KULLANICISI UYGULAMADAN (kullanıcı, 12 Eylül: "bulut hesabını uygulama içinden
// Supabase'e bağlayalım").
//
// Supabase auth ve `kullanici` fonksiyonu sahte yanıtla karşılanıyor. Ölçülen:
//   1. Yönetici bulut kimliğiyle girer; Tanımlar > Kullanıcılar'da yeni kullanıcı ekler →
//      fonksiyon `ekle` + doğru e-posta + şifreyle çağrılır; kayıt `bulutHesabi: true`, `eposta`
//      dolu, ŞİFRE KAYITTA YOK.
//   2. Fonksiyon reddederse (ör. kurulmamış) kullanıcı EKLENMEZ (v1.445.0: yerel şifre yedeği
//      kaldırıldı — eskiden "yine de yerel kaydedilsin mi?" sorulup şifre düz metin yazılıyordu).
//      Sebep pencerede söylenir; Tanımlar'a hiçbir şey yazılmaz, şifre hiçbir kayıtta yok.
//   3. Silme: fonksiyon `sil` çağrılır, kayıt silinir. Fonksiyon reddederse kayıt DURUR.
//      Eskiden kalma YEREL kayıt (bulut hesabı yok) bulut reddetse de silinebilir — temizlik yolu.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({
    ...tanimlar, girisAktifMi: true,
    kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "Mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true },
      // v1.445.0 öncesinden kalma yerel kayıt: artık oluşturulamıyor ama eski veride olabilir.
      { id: "k9", ad: "Eski Yerel", kullaniciAdi: "Veli", rol: "Kullanıcı", yetkiler: {}, sifre: "eski-duz-metin", bulutHesabi: false }],
  });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const diyaloglar = []; sayfa.on("dialog", (d) => { diyaloglar.push(d.message().split("\n")[0]); d.accept(); });

  const cagrilar = [];
  let fonksiyonCevabi = () => ({ status: 200, govde: { tamam: true, mesaj: "Bulut hesabı açıldı", kullaniciId: "uid-1" } });
  await sayfa.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ access_token: "jeton-a", refresh_token: "r", expires_in: 3600, user: { email: "mahmut@atolye.local" } }) }));
  await sayfa.route("**/functions/v1/kullanici", (route) => {
    const istek = route.request();
    let govde = {}; try { govde = JSON.parse(istek.postData() || "{}"); } catch (e) { /* */ }
    cagrilar.push({ ...govde, yetki: istek.headers()["authorization"] || "" });
    const c = fonksiyonCevabi(govde);
    return route.fulfill({ status: c.status, contentType: "application/json", body: JSON.stringify(c.govde) });
  });
  await sayfa.waitForTimeout(2500);

  // Giriş (bulut).
  await sayfa.locator('input:not([type="password"])').first().fill("Mahmut");
  await sayfa.locator('input[type="password"]').first().fill("gizli123");
  await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
  await sayfa.waitForTimeout(1500);

  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kullanıcılar" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  const kullaniciEkle = async (ad, ka, sifre) => {
    await sayfa.locator('input[placeholder="Ad Soyad"]').fill(ad);
    await sayfa.locator('input[placeholder="Kullanıcı adı"]').fill(ka);
    await sayfa.locator('input[placeholder="Şifre"]').fill(sifre);
    await sayfa.evaluate(() => { const b = document.querySelector("[data-kullanici-ekle]"); if (b) b.click(); });
    await sayfa.waitForTimeout(1200);
  };
  const kayitlar = async () => ((await depoOku(sayfa, "tanimlar:data")).kullanicilar || [])
    .map((k) => ({ ka: k.kullaniciAdi, eposta: k.eposta || null, bulut: k.bulutHesabi, sifreVar: "sifre" in k }));

  // 1. Bulut başarılı.
  await kullaniciEkle("Ayşe Çelik", "Ayşe", "sifre123");
  const basarili = { cagri: cagrilar[cagrilar.length - 1], kayitlar: await kayitlar() };

  // 1b. ŞABLON YANITI (kullanıcı, 12 Eylül: "HTTP 200"): fonksiyon açılmış ama dosya yapıştırılmamış,
  //     Supabase "Hello" şablonu 200 dönüyor. Mesaj bunu SÖYLEMELİ. Diyalogda iptal → kayıt yok.
  fonksiyonCevabi = () => ({ status: 200, govde: { message: "Hello undefined!" } });
  const iptalEt = (d) => { diyaloglar.push(d.message().split("\n")[1]); d.dismiss(); };
  sayfa.removeAllListeners("dialog"); sayfa.on("dialog", iptalEt);
  await kullaniciEkle("Şablon Test", "sablon", "sifre789");
  const sablon = { mesaj: diyaloglar[diyaloglar.length - 1], eklenmedi: !(await kayitlar()).some((k) => k.ka === "sablon") };
  sayfa.removeAllListeners("dialog"); sayfa.on("dialog", (d) => { diyaloglar.push(d.message().split("\n")[0]); d.accept(); });

  // 2. Fonksiyon reddediyor (kurulu değil: 404) → kullanıcı EKLENMEZ, sebep pencerede.
  fonksiyonCevabi = () => ({ status: 404, govde: { message: "not found" } });
  const diyalogOnce = diyaloglar.length;
  await kullaniciEkle("Zeki Kaya", "Zeki", "sifre456");
  const reddedildi = {
    diyalog: diyaloglar[diyaloglar.length - 1],
    diyalogAdedi: diyaloglar.length - diyalogOnce,   // tek pencere: soru değil bildirim
    eklenmedi: !(await kayitlar()).some((k) => k.ka === "Zeki"),
    formDoluKaldi: await sayfa.locator('input[placeholder="Kullanıcı adı"]').inputValue(),
    kayitlar: await kayitlar(),
  };

  // 3. Silme — bulut kabul.
  fonksiyonCevabi = () => ({ status: 200, govde: { tamam: true, mesaj: "Bulut hesabı silindi" } });
  const sil = async (ka) => {
    await sayfa.evaluate((ka) => {
      const satir = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === `@${ka}`);
      const b = satir && satir.parentElement.querySelector('button[title="Kullanıcıyı ve bulut hesabını sil"]');
      if (b) b.click();
    }, ka);
    await sayfa.waitForTimeout(1200);
  };
  // Önce bulut REDDEDİYOR: bulut hesabı olan Ayşe'nin kaydı DURMALI.
  fonksiyonCevabi = () => ({ status: 500, govde: { tamam: false, hata: "sunucu hatası" } });
  await sil("Ayşe");
  const silmeReddi = { kaldi: (await kayitlar()).some((k) => k.ka === "Ayşe") };
  fonksiyonCevabi = () => ({ status: 200, govde: { tamam: true, mesaj: "Bulut hesabı silindi" } });
  await sil("Ayşe");
  const silindi = { cagri: cagrilar[cagrilar.length - 1], kayitlar: await kayitlar() };
  // Bulut reddederse kayıt durur — AMA eski yerel kaydın (Veli) bulut hesabı yok: yerel silme yeter.
  fonksiyonCevabi = () => ({ status: 500, govde: { tamam: false, hata: "sunucu hatası" } });
  await sil("Veli");
  const yerelSilindi = { kayitlar: await kayitlar() };

  await tarayici.close();
  return { hatalar, basarili, sablon, reddedildi, silmeReddi, silindi, yerelSilindi, diyalogSayisi: diyaloglar.length };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
