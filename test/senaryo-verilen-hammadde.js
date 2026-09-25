// SENARYO — VERİLEN HAMMADDE VE OTOMATİK ARTAN.
//
// Kullanıcı (6 Eylül): "Üretimde proses teslim alırken artan hammadde sorunu, verirken de
// göstersin — aynı ekran, aynı adetler. Örnek: deri bölünmez, ihtiyaç 300 desi ama bir kanat
// 390 desi var; kesiciye bunu verip artanı almamız gerekiyor. Arkada otomatik 90 getirsin, az
// veya fazla varsa kullanıcı girsin."
//
// Eskiden hammadde YALNIZCA teslim alırken, reçeteye göre düşülüyordu; "gerçekte ne verildi"
// bilgisi sistemde hiç yoktu. Artan kutusu da boş başlıyor, kullanıcı farkı kafadan hesaplıyordu.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const ACIK_URETIM = [{
  id: "up2", siparisNo: "1002", takipKodu: "1002", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
  bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
  stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
  prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: false, tamamlandiMi: false, personelId: null, atamalar: [] }],
}];

async function kartiAc(sayfa) {
  await sayfa.getByRole("button", { name: "Üretim", exact: true }).first().click();
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("*")]
      .filter((x) => x.children.length === 0 && /^1002$/.test(x.textContent.trim()))[0];
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1400);
}

async function calistir() {
  const t = { ...TOHUM };
  t["uretim:siparisler"] = JSON.stringify(ACIK_URETIM);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await kartiAc(sayfa);

  // VERME EKRANINDA HAMMADDE ALANI — teslim alma ekranındaki "artan" tablosunun eşi.
  const vermeEkrani = await sayfa.evaluate(() => ({
    alanVar: /Verilen hammadde/.test(document.body.innerText),
    // Reçete beklentisi hücrede yazılı: kullanıcı neye göre değerlendireceğini görsün.
    kutular: [...document.querySelectorAll("input")]
      .filter((i) => /^Reçeteye göre/.test(i.title || ""))
      .map((i) => i.placeholder),
  }));

  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")]
      .find((x) => [...x.options].some((o) => /Personel C/.test(o.textContent)));
    const o = [...s.options].find((x) => /Personel C/.test(x.textContent));
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);

  // REÇETE 6 METRE ama 8 METRE veriliyor (deri bölünmüyor).
  await sayfa.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const i = [...document.querySelectorAll("input")].filter((x) => /^Reçeteye göre 6/.test(x.title || ""))[0];
    set.call(i, "8");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /İşi Ver/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1600);

  const uretim = await depoOku(sayfa, "uretim:siparisler");
  const atama = ((((uretim || [])[0] || {}).prosesIlerleme || [])[0] || {}).atamalar[0] || {};
  // Reçete kadar verilen kalem de KAYDA GİRİYOR: "girilmedi" ile "reçete kadar" ayrımı sonradan
  // yapılamaz ve teslim ekranı hangisi olduğunu bilmek zorunda.
  const verilenKaydi = Object.values(atama.verilenHammaddeler || {}).map((v) => [v.ad, v.beklenen, v.verilen]);

  // TESLİM EKRANINDA ARTAN OTOMATİK: 8 − 6 = 2.
  const teslimEkrani = await sayfa.evaluate(() => ({
    artanBolumu: /Artan ve eksik malzeme/.test(document.body.innerText),
    kutular: [...document.querySelectorAll("input")]
      .filter((i) => /artan/.test(i.title || ""))
      .map((i) => [i.value, i.title]),
  }));

  // EK ALINAN KUTUSU (20 Eylül): artan kutusunun altında ikinci kutu — iş sırasında depodan
  // fazladan alınan malzeme buradan bildiriliyor.
  const ekAlinanKutusu = await sayfa.evaluate(() => document.querySelectorAll("[data-ek-alinan-kutusu]").length);

  // VERİLEN MİKTAR EKRANDA (20 Eylül): kutunun yanındaki sayı reçete değil, GERÇEKTE VERİLEN.
  // Reçeteden farklıysa reçete parantez içinde duruyor.
  const verilenEtiketi = await sayfa.evaluate(() => {
    const m = document.body.innerText.replace(/\n/g, " ");
    const bul = m.match(/\/\d+(?:[.,]\d+)?\s*\(reçete\s*\d+/);
    return bul ? bul[0] : null;
  });

  // STOK ÇIKIŞI ELLE VERİLEN MİKTARDAN (19 Eylül): reçete kadar değil, ustaya verilen kadar
  // düşmeli. Eskiden çıkış reçeteden hesaplanıyordu ve aradaki fark havada kalıyordu.
  const cikisHareketleri = (await depoOku(sayfa, "stok:items"))
    .flatMap((u) => (u.hareketler || [])
      .filter((h) => h.kaynak === "Üretim" && (h.miktar || 0) < 0)
      .map((h) => `${u.ad}:${Math.abs(h.miktar)}`));

  await tarayici.close();
  return { hatalar, vermeEkrani, verilenKaydi, ekAlinanKutusu, verilenEtiketi, cikisHareketleri, teslimEkrani };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
