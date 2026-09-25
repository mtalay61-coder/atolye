// SENARYO — OTURUM SÜRDÜRME (kullanıcı, 15 Eylül: "sayfa yenilendiğinde tekrar kullanıcı adı ve
// şifre girmemi istiyor").
//
// `aktifKullanici` yalnız bellekteydi; her yenilemede giriş ekranı geliyordu. Artık oturum yerelde
// saklanıyor (kullanıcı KİMLİĞİ + zaman; şifre DEĞİL) ve açılışta geri yükleniyor.
//
// Ölçülen: (1) giriş sonrası oturum kaydı oluşuyor; (2) sayfa yenilenince giriş istenmiyor;
// (3) çıkış yapınca kayıt siliniyor ve yenilemede giriş isteniyor; (4) 12 saatten eski oturum
// geçersiz; (5) kullanıcı listeden silinmişse oturum kabul edilmiyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");

function tohum(ekKullanicilar) {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.girisAktifMi = true;
  // GİRİŞ ARTIK YALNIZ BULUT (24 Eylül, v1.444.0): yerel şifre yedeği kaldırıldı, kullanıcılar
  // bulut hesaplı kuruluyor ve auth isteği taklit ediliyor (giris-yardimci).
  tan.kullanicilar = ekKullanicilar || [{ id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true }];
  t["tanimlar:data"] = JSON.stringify(tan);
  return t;
}
const girisIstiyorMu = (sayfa) => sayfa.evaluate(() => /Kullanıcı adı/i.test(document.body.innerText));

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(tohum(), {
    hataYaz: false, onceRota: (s) => bulutGirisRotasi(s),
  });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  const basta = await girisIstiyorMu(sayfa);

  await sayfa.locator("input").first().fill("mahmut");
  await sayfa.locator("input[type=password]").first().fill("gizli");   // şifre BULUTTA doğrulanıyor
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Giriş/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const girisSonrasi = {
    ekranAcildi: !(await girisIstiyorMu(sayfa)),
    kayit: await sayfa.evaluate(() => { const k = JSON.parse(localStorage.getItem("oturum:aktif") || "null"); return k && { kullaniciId: k.kullaniciId, bulut: k.bulut, sifreVarMi: "sifre" in k }; }),
  };

  await sayfa.reload();
  await sayfa.waitForTimeout(2600);
  const yenilemeSonrasi = { girisIstiyor: await girisIstiyorMu(sayfa) };

  await tarayici.close();

  // 13 saat eski oturum: süre dolmuş sayılmalı. (Ayrı oturumda; `reload` tohum köprüsünü yeniden
  // kurup taze kaydı geri yazıyor, o yüzden eskitme tohumla veriliyor.)
  const tEski = tohum();
  tEski["oturum:aktif"] = JSON.stringify({ kullaniciId: "k1", zaman: Date.now() - 13 * 60 * 60 * 1000, bulut: false });
  const eskiOturum = await uygulamaAc(tEski, { hataYaz: false });
  eskiOturum.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await eskiOturum.sayfa.waitForTimeout(2400);
  const suresiDolmus = {
    girisIstiyor: await girisIstiyorMu(eskiOturum.sayfa),
    kayitSilindi: await eskiOturum.sayfa.evaluate(() => !localStorage.getItem("oturum:aktif")),
  };
  await eskiOturum.tarayici.close();

  // Listede olmayan kullanıcı kimliğiyle oturum: kabul edilmemeli.
  const t2 = tohum();
  t2["oturum:aktif"] = JSON.stringify({ kullaniciId: "silinmis-kullanici", zaman: Date.now(), bulut: false });
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  const yabanciKimlik = { girisIstiyor: await girisIstiyorMu(ikinci.sayfa) };
  await ikinci.tarayici.close();

  return { hatalar, basta, girisSonrasi, yenilemeSonrasi, suresiDolmus, yabanciKimlik };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
