// SENARYO — ÜRETİMDEN KOLİ: KALAN DÜŞÜLÜR, AŞIM REDDEDİLİR (kullanıcı, 13 Eylül).
//
//   "25 çift ürün için 8'li koli kurduğumuzda 17 çift kalması gerekir; 4 tane 8'li koli kurdum
//    ama hâlâ koli kurdurabiliyor. Kontrol koyalım."
//
// Üretim 41 bedenden 25 çift, stoğa eklenmiş. "Getir" ile üretim no okutulup 8'li koli kuruluyor:
// 1. koliden sonra kalan 17, 2.'den sonra 9, 3.'ten sonra 1; 4. koli (8) REDDEDİLİR, kalan 1'lik
// koli kabul edilir ve beden listeden düşer.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 25 }];
  bot.stokNo = 7;
  t["stok:items"] = JSON.stringify(stok);
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  tanimlar.renkler = (tanimlar.renkler || []).map((r, i) => ({ ...r, barkodKodu: i + 1 }));
  tanimlar.bedenler = (tanimlar.bedenler || []).map((b, i) => ({ ...b, barkodKodu: i + 1 }));
  t["tanimlar:data"] = JSON.stringify(tanimlar);
  t["uretim:siparisler"] = JSON.stringify([{ id: "up25", siparisNo: "10025", takipKodu: "10025", model: "Bot", urunId: "u2", renk: "Siyah", adet: 25,
    bedenMiktarlari: [{ beden: "41", miktar: 25 }], stogaEklendiMi: true, durum: "Tamamlandı", prosesIlerleme: [] }]);
  t["koli:data"] = JSON.stringify([]);
  t["siparis:data"] = JSON.stringify([]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Paketleme", exact: true }).click();
  await sayfa.waitForTimeout(600);
  // Bekleyen üretimler listesini aç (kapalı gelir).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Paketlemeyi bekleyen üretimler/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  const koliKur = async (adet) => {
    await sayfa.locator("[data-yeni-koli]:visible").click();
    await sayfa.waitForTimeout(400);
    await sayfa.locator('input[title="Sipariş / üretim no"]:visible').fill("10025");
    await sayfa.locator("[data-kaynak-getir]:visible").click();
    await sayfa.waitForTimeout(500);
    const kalanMetni = await sayfa.evaluate(() => {
      const i = [...document.querySelectorAll('input[title="Koliye eklenecek adet"]')].find((x) => x.getBoundingClientRect().width > 0);
      return i ? (i.parentElement.textContent.match(/\/(\d+)/) || [])[1] || null : "kutu-yok";
    });
    if (kalanMetni !== "kutu-yok") {
      await sayfa.locator('input[title="Koliye eklenecek adet"]:visible').first().fill(String(adet));
      await sayfa.locator("[data-koli-kaydet]:visible").first().click();
      await sayfa.waitForTimeout(900);
    }
    const koliler = (await depoOku(sayfa, "koli:data")) || [];
    // BEKLEYEN ÜRETİMLER LİSTESİ (13 Eylül): toplam · kalan; tamamı kolilenince listeden düşer.
    const bekleyen = await sayfa.evaluate(() => { const e = document.querySelector('[data-bekleyen-uretim="10025"]'); return e ? `${e.getAttribute("data-toplam")}/${e.getAttribute("data-kalan")}:${(e.textContent.match(/Kutu Etiketleri \((\d+)\)/) || [])[1]}` : "listede-yok"; });
    const uyari = await sayfa.evaluate(() => (document.body.innerText.match(/Üretim aşılıyor[^\n]*/) || [])[0] || null);
    // Form açık kaldıysa (ret) kapat.
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Vazgeç/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(300);
    return { kalanGosterildi: kalanMetni, koliSayisi: koliler.length, uyari, bekleyen };
  };

  const adimlar = [];
  adimlar.push(await koliKur(8));   // kalan 25 → 17
  adimlar.push(await koliKur(8));   // 17 → 9
  adimlar.push(await koliKur(8));   // 9 → 1
  adimlar.push(await koliKur(8));   // 1 kaldı, 8 REDDEDİLİR
  adimlar.push(await koliKur(1));   // 1 kabul → 0
  adimlar.push(await koliKur(1));   // beden listede yok

  await tarayici.close();
  return { hatalar, adimlar };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
