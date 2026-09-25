// SENARYO — SOHBET (kullanıcı, 14 Eylül: "sohbet de olsun, kullanıcıyla aynı bu ekrandan devam
// etsin; sohbete görev ekleme gibi hepsi sohbetin parçası olsun").
//
// Ölçülen: ekip ve kişisel kanallar; mesaj gönderme; KAYIT BAĞLAMA (sipariş seçip mesaja iliştirme);
// SOHBETTEN GÖREV VERME (akışta görev kartı, görev kaydı oluşuyor); kart üstünden durum değişimi ve
// kontrol kuralı; okunmamış sayacı; kalıcılık (mesaj:data, gorev:data).
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
  t["gorev:data"] = JSON.stringify([]);
  t["mesaj:data"] = JSON.stringify([]);
  let { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // v1.445.0: yerel şifre yedeği yok — giriş bulut taklidiyle (eskiden auth 400 → yerel şifre).
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);

  const girisYap = async (ad) => {
    await sayfa.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
    await sayfa.locator('input:not([type="password"]):visible').first().fill(ad);
    await sayfa.locator('input[type="password"]:visible').first().fill("gizli123");
    await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
    await sayfa.waitForTimeout(1500);
  };
  const sohbeteGit = async () => {
    await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sohbet"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(500);
  };

  // ---- 1) MAHMUT: ekip kanalına mesaj, kişisel kanala kayıt bağlı görev ----
  await girisYap("mahmut");
  await sohbeteGit();
  const kanallar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-sohbet-kanal]")].map((e) => e.getAttribute("data-sohbet-kanal").includes("|") ? "kisisel" : e.getAttribute("data-sohbet-kanal")));
  await sayfa.locator("[data-sohbet-kutusu]").fill("Sabah toplantısı 8'de");
  await sayfa.evaluate(() => document.querySelector("[data-sohbet-gonder]").click());
  await sayfa.waitForTimeout(600);

  // Ali kanalına geç: kayıt bağla (sipariş) + görev olarak ver.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-sohbet-kanal]")].find((e) => e.getAttribute("data-sohbet-kanal").includes("|")); b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => document.querySelector("[data-kayit-sec]").click());
  await sayfa.waitForTimeout(300);
  const kayitAdaylari = await sayfa.evaluate(() => [...document.querySelectorAll("[data-kayit-aday]")].map((e) => e.textContent.trim()));
  await sayfa.evaluate(() => document.querySelector("[data-kayit-aday]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => document.querySelector("[data-sohbet-gorev-modu]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-sohbet-gorev-bitis]").fill("2026-09-25");
  await sayfa.locator("[data-sohbet-kutusu]").fill("Bu siparişin kesimini bugün bitir");
  await sayfa.evaluate(() => document.querySelector("[data-sohbet-gonder]").click());
  await sayfa.waitForTimeout(800);

  const mahmutAkis = await sayfa.evaluate(() => [...document.querySelectorAll("[data-sohbet-mesaj]")].map((e) => ({
    metin: (e.querySelector("div:nth-child(2)") || {}).textContent,
    hedef: (e.querySelector("[data-mesaj-hedef]") || {}).textContent || null,
    gorevDurum: (e.querySelector("[data-sohbet-gorev]") || {}).getAttribute ? e.querySelector("[data-sohbet-gorev]").getAttribute("data-sohbet-gorev-durum") : null,
  })));
  const gorevKaydi = ((await depoOku(sayfa, "gorev:data")) || []).map((g) => `${g.baslik}:${g.atananId}:${g.bitisTarihi}:${g.hedef ? g.hedef.tip : "yok"}`);

  // ---- 2) ALİ: okunmamış sayacı, kart üstünden durum, kontrol kuralı ----
  const aktar = { "mesaj:data": JSON.stringify(await depoOku(sayfa, "mesaj:data")), "gorev:data": JSON.stringify(await depoOku(sayfa, "gorev:data")) };
  await tarayici.close();
  const ikinci = await uygulamaAc({ ...t, ...aktar }, { hataYaz: false });
  sayfa = ikinci.sayfa; tarayici = ikinci.tarayici;
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // v1.445.0: yerel şifre yedeği yok — giriş bulut taklidiyle (eskiden auth 400 → yerel şifre).
  await bulutGirisRotasi(sayfa);
  await sayfa.waitForTimeout(2500);
  await girisYap("ali");
  const aliMenuRozeti = await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sohbet"]'); const r = b && b.querySelector("[data-nav-rozet]"); return r ? r.getAttribute("data-nav-rozet") : "yok"; });
  await sohbeteGit();
  const aliOkunmamis = await sayfa.evaluate(() => [...document.querySelectorAll("[data-sohbet-okunmamis]")].map((e) => e.getAttribute("data-sohbet-okunmamis")));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-sohbet-kanal]")].find((e) => e.getAttribute("data-sohbet-kanal").includes("|")); b.click(); });
  await sayfa.waitForTimeout(500);
  // Ali "Tamamlandı"ya alamaz; "Yapılıyor"a alabilir.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-sohbet-durum]")].find((x) => x.getAttribute("data-sohbet-durum") === "Tamamlandı"); b.click(); });
  await sayfa.waitForTimeout(600);
  const aliTamamlamaReddi = await sayfa.evaluate(() => /yalnız görevi veren/.test(document.body.innerText));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-sohbet-durum]")].find((x) => x.getAttribute("data-sohbet-durum") === "Yapılıyor"); b.click(); });
  await sayfa.waitForTimeout(700);
  const gorevSonrasi = ((await depoOku(sayfa, "gorev:data")) || [])[0];

  // WHATSAPP + ANASAYFA (17 Eylül): görev kartında WhatsApp bağlantısı var mı, anasayfada
  // "açık görevlerim" paneli görev atanınca çıkıyor mu.
  const whatsappBaglantisi = await sayfa.evaluate(() => {
    const a = document.querySelector("[data-gorev-whatsapp]");
    return a ? { varMi: true, wa: /^https:\/\/wa\.me\//.test(a.getAttribute("href") || ""), gorevYazisi: /G%C3%96REV/.test(a.getAttribute("href") || "") } : { varMi: false };
  });
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Anasayfa"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const anasayfaGorevleri = await sayfa.evaluate(() => ({
    panelVar: !!document.querySelector("[data-anasayfa-gorevler]"),
    gorevSayisi: document.querySelectorAll("[data-anasayfa-gorev]").length,
    stokKartiKaldirildi: !/TOPLAM STOK DEĞERİ|Kritik Stok/i.test(document.body.innerText),
  }));

  await tarayici.close();
  return { hatalar, whatsappBaglantisi, anasayfaGorevleri, kanallar, kayitAdaylari: kayitAdaylari.slice(0, 3), mahmutAkis, gorevKaydi,
    aliMenuRozeti, aliOkunmamis, aliTamamlamaReddi, gorevDurumSon: gorevSonrasi.durum,
    gorevAkisi: (gorevSonrasi.yorumlar || []).map((y) => y.metin) };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
