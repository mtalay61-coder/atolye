// SENARYO — GÖREVLER (kullanıcı, 14 Eylül: "kullanıcılara görev tanımlama, yazışma, kontrol").
//
// Ölçülen: görev verme (atama, bitiş, acil); süzgeçler (bana / verdiğim / açık / kapalı);
// durum akışı ve KONTROL KURALI (atanan kendi işini Tamamlandı'ya alamaz, Kontrole gönderir;
// atayan onaylar); yorum ve durum değişimlerinin aynı akışta kalması; gecikmiş işareti;
// menü rozeti; kalıcılık (gorev:data).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({
    ...tanimlar, girisAktifMi: true,
    kullanicilar: [
      { id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", sifre: "gizli123", rol: "Yönetici", yetkiler: {} },
      { id: "k2", ad: "Ali Usta", kullaniciAdi: "ali", sifre: "gizli123", rol: "Kullanıcı", yetkiler: {} },
    ],
  });
  // Gecikmiş bir görev (dün bitmesi gerekiyordu) ve Ali'ye ait açık görev.
  const dun = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  t["gorev:data"] = JSON.stringify([
    { id: "g-eski", baslik: "Kalıpları teslim al", aciklama: "", atananId: "k2", atayanId: "k1",
      durum: "Yapılıyor", oncelik: "Normal", bitisTarihi: dun, olusturma: "2026-09-10T08:00:00.000Z",
      guncelleme: "2026-09-10T08:00:00.000Z", tamamlanma: "", hedef: null, yorumlar: [] },
  ]);
  let { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // v1.445.0: yerel şifre yedeği yok — giriş bulut taklidiyle (eskiden auth 400 → yerel şifre).
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);

  const girisYap = async (ad) => {
    // Giriş ekranındaki kutular (sayfada başka gizli aramalar da var).
    await sayfa.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
    await sayfa.locator('input:not([type="password"]):visible').first().fill(ad);
    await sayfa.locator('input[type="password"]').first().fill("gizli123");
    await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
    await sayfa.waitForTimeout(1500);
  };
  const gorevlereGit = async () => {
    await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sohbet"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(400);
    // Görev listesi ikinci sekmede (birincisi sohbet).
    await sayfa.evaluate(() => { const b = document.querySelector('[data-gorev-sekme="liste"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(400);
  };

  // ---- 1) YÖNETİCİ: görev ver ----
  await girisYap("mahmut");
  const menuRozetiYonetici = await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sohbet"]'); const r = b && b.querySelector("[data-nav-rozet]"); return r ? r.getAttribute("data-nav-rozet") : "yok"; });
  await gorevlereGit();
  await sayfa.evaluate(() => document.querySelector("[data-gorev-yeni]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-gorev-baslik]").fill("10007 kesimini bitir");
  await sayfa.locator("[data-gorev-atanan]").selectOption({ label: "Ali Usta" });
  await sayfa.locator("[data-gorev-bitis]").fill("2026-09-20");
  await sayfa.evaluate(() => document.querySelector("[data-gorev-kaydet]").click());
  await sayfa.waitForTimeout(700);
  const verdigim = await sayfa.evaluate(() => { const b = document.querySelector('[data-gorev-suzgec="atadigim"]'); b.click(); return null; });
  await sayfa.waitForTimeout(400);
  const yoneticiEkran = await sayfa.evaluate(() => ({
    verdigimSayisi: document.querySelectorAll("[data-gorev]").length,
    ilkBaslik: (document.querySelector("[data-gorev] b") || {}).textContent,
  }));
  void verdigim;

  // ---- 2) ALİ: kendi görevi, kontrol kuralı, yorum ----
  // Ayrı oturum: çıkış düğmesi yerine ikinci tarayıcı örneği (gerçekte ikinci bilgisayar). Görev
  // listesi depodan alınıp ikinci örneğin tohumuna konuyor.
  const gorevlerArasi = await depoOku(sayfa, "gorev:data");
  await tarayici.close();
  const t2 = { ...t, "gorev:data": JSON.stringify(gorevlerArasi) };
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  sayfa = ikinci.sayfa; tarayici = ikinci.tarayici;
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // v1.445.0: yerel şifre yedeği yok — giriş bulut taklidiyle (eskiden auth 400 → yerel şifre).
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);
  await girisYap("ali");
  const aliRozet = await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sohbet"]'); const r = b && b.querySelector("[data-nav-rozet]"); return r ? r.getAttribute("data-nav-rozet") : "yok"; });
  await gorevlereGit();
  const aliListe = await sayfa.evaluate(() => [...document.querySelectorAll("[data-gorev]")].map((e) => `${e.querySelector("b").textContent}:${e.getAttribute("data-gorev-durum")}:${(e.querySelector("[data-gorev-gecikmis]") || {}).getAttribute ? e.querySelector("[data-gorev-gecikmis]").getAttribute("data-gorev-gecikmis") : "-"}`));
  // Kartı aç, "Tamamlandı"ya almayı dene (reddedilmeli), sonra Kontrole gönder.
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector("div").click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector('[data-gorev-durum-dugme="Tamamlandı"]').click(); });
  await sayfa.waitForTimeout(600);
  const tamamlamaReddi = await sayfa.evaluate(() => /yalnız görevi veren/.test(document.body.innerText));
  const durumSonra1 = ((await depoOku(sayfa, "gorev:data")) || []).find((g) => /10007/.test(g.baslik)).durum;
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector('[data-gorev-durum-dugme="Kontrolde"]').click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-gorev-yorum-kutusu]:visible").first().fill("Kesim bitti, sayaya verildi");
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector("[data-gorev-yorum-gonder]").click(); });
  await sayfa.waitForTimeout(700);
  const akis = ((await depoOku(sayfa, "gorev:data")) || []).find((g) => /10007/.test(g.baslik));
  const akisOzeti = { durum: akis.durum, yorumlar: (akis.yorumlar || []).map((y) => `${y.sistem ? "sistem" : y.kullaniciAd}: ${y.metin}`) };

  // ---- 3) YÖNETİCİ onaylar (üçüncü oturum) ----
  const gorevlerArasi2 = await depoOku(sayfa, "gorev:data");
  await tarayici.close();
  const ucuncu = await uygulamaAc({ ...t, "gorev:data": JSON.stringify(gorevlerArasi2) }, { hataYaz: false });
  sayfa = ucuncu.sayfa; tarayici = ucuncu.tarayici;
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // v1.445.0: yerel şifre yedeği yok — giriş bulut taklidiyle (eskiden auth 400 → yerel şifre).
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);
  await girisYap("mahmut");
  await gorevlereGit();
  await sayfa.evaluate(() => { document.querySelector('[data-gorev-suzgec="tumu"]').click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector("div").click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-gorev]")].find((x) => /10007/.test(x.textContent)); e.querySelector('[data-gorev-durum-dugme="Tamamlandı"]').click(); });
  await sayfa.waitForTimeout(700);
  const son = ((await depoOku(sayfa, "gorev:data")) || []).find((g) => /10007/.test(g.baslik));
  const kapaliSuzgec = await sayfa.evaluate(() => { document.querySelector('[data-gorev-suzgec="kapali"]').click(); return null; });
  await sayfa.waitForTimeout(400);
  const kapaliListe = await sayfa.evaluate(() => [...document.querySelectorAll("[data-gorev]")].map((e) => e.querySelector("b").textContent));
  void kapaliSuzgec;

  await tarayici.close();
  return { hatalar, menuRozetiYonetici, yoneticiEkran, aliRozet, aliListe, tamamlamaReddi, durumSonra1, akisOzeti, sonDurum: son.durum, tamamlanmaVar: !!son.tamamlanma, kapaliListe };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
