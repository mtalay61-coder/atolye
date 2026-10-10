// SENARYO — BÜYÜK VERİDE HIZ KORUMALARI (10 Ekim, v1.633.0).
// Kullanıcı: "uygulama doldukça yavaşlama başladı gibi, menüler v.s geç açılıyor".
// Ölçülen:
//  1. Fişler listesi 100'er çiziliyor; "Daha fazla göster" 100 ekliyor, hepsi çizilince düğme kayboluyor.
//     Arama BÜTÜN fişlerde: ilk 100'de olmayan eski fiş bulunuyor; arama temizlenince sınır başa dönüyor.
//  2. Gizli modül dondurma (GizliModul): başka modüle geçip dönünce Fişler'in arama metni korunuyor ve
//     gizliyken eklenen veri döndüğünde görünüyor (dondurma, görünür olunca güncel prop'larla çiziyor).
//  3. Üst menü sığdırma her çizimde değil, boyut değişince ölçülüyor: pencere daralınca menü sıkışıyor
//     (sik-N sınıfı), genişleyince açılıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  const no = (i) => String(i).padStart(4, "0");
  const gun = (i) => `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, "0")}`;
  cariler[1].hareketler = Array.from({ length: 250 }, (_, i) => ({
    id: `th${i}`, tarih: gun(i), zaman: `${gun(i)}T10:00:00.000Z`, yon: "Alacak", tutar: 10 + i, paraBirimi: "TRY",
    odemeSekli: "Nakit", vade: "", fisNo: `THS-${no(i)}`, islemTipi: "Tahsilat", defter: "Genel", aciklama: "Tahsilat",
  }));
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonuc = {};
  const kartSayisi = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-kart]")].filter((x) => x.getBoundingClientRect().width > 0).length);
  const dugme = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-fis-daha-fazla]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.textContent.trim() : null; });
  const ara = async (metin) => { await sayfa.locator('input[placeholder^="Fiş no, sipariş no"]:visible').first().fill(metin); await sayfa.waitForTimeout(400); };

  await modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(800);
  sonuc.ilk = { kart: await kartSayisi(), dugme: await dugme() };
  for (let i = 1; i <= 2; i++) {
    await sayfa.locator("[data-fis-daha-fazla]:visible").first().click(); await sayfa.waitForTimeout(500);
    sonuc[`dahaFazla${i}`] = { kart: await kartSayisi(), dugme: await dugme() };
  }
  await ara("THS-0003");
  sonuc.eskiFisArama = { kart: await kartSayisi(), dugme: await dugme() };
  // × ile temizleme (v1.634.1 — kullanıcı: "aramada × da çıksın hızlı silme için").
  await sayfa.locator('[data-arama-temizle="fisler"]:visible').first().click(); await sayfa.waitForTimeout(400);
  sonuc.carpiyleTemizlendi = { metin: await sayfa.locator('input[placeholder^="Fiş no, sipariş no"]:visible').first().inputValue(),
    carpiGizlendi: !(await sayfa.locator('[data-arama-temizle="fisler"]:visible').count()) };
  sonuc.aramaTemizlenince = { kart: await kartSayisi(), dugme: await dugme() };

  // Gizli modül: arama metni korunuyor, döndüğünde güncel.
  await ara("THS-024");
  await modulAc(sayfa, "Anasayfa"); await sayfa.waitForTimeout(500);
  await modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(600);
  sonuc.donunceArama = { metin: await sayfa.locator('input[placeholder^="Fiş no, sipariş no"]:visible').first().inputValue(), kart: await kartSayisi() };

  // Üst menü sığdırma: daralınca sıkışma sınıfı geliyor, genişleyince kalkıyor.
  const kademe = () => sayfa.evaluate(() => { const m = document.querySelector(".ust-menu"); const s = m && [...m.classList].find((c) => /^sik-\d$/.test(c)); return s ? Number(s.slice(4)) : 0; });
  await sayfa.setViewportSize({ width: 1600, height: 900 }); await sayfa.waitForTimeout(500);
  const genis = await kademe();
  await sayfa.setViewportSize({ width: 800, height: 900 }); await sayfa.waitForTimeout(500);
  const dar = await kademe();
  await sayfa.setViewportSize({ width: 1600, height: 900 }); await sayfa.waitForTimeout(500);
  sonuc.ustMenu = { darDahaSikisik: dar > genis, genisleyinceGeriAcildi: (await kademe()) === genis };

  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
