// SENARYO — KATALOGDA 3 FİYAT (4 Ekim, v1.584.0; 5 Ekim v1.590.0: seçim Fiyat Listesi'nde ve bulutta).
// Kullanıcı: "Katalog şeklinde 3 farklı fiyat göstersin; girilen fiyatlar, katalog fiyatı seçilerek katalogda görünecek
// fiyatlar çıksın." Ölçülen: genel satış + Toptan $ + Perakende ₺ seçilince kartta ve detayda üçü de; dördüncü seçilemez;
// müşteri görünümünde alış tipli kaynak gizli; seçim yerel depoda kalıcı. Cariye özel fiyat katalogda yine yok (senaryo-katalog).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.fiyatGruplari = [{ id: "fgT", ad: "Toptan USD", tip: "Satış", paraBirimi: "$" }, { id: "fgP", ad: "Perakende", tip: "Satış", paraBirimi: "₺" }, { id: "fgA", ad: "Tedarikçi Alış", tip: "Alış", paraBirimi: "₺" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(t["stok:items"]);
  st.push({ id: "k3", ad: "27325 D", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", satisFiyati: 1299, satisParaBirimi: "₺", alisFiyati: 700, alisParaBirimi: "₺",
    variants: [{ renk: "Taba", beden: "38", miktar: 2 }], hareketler: [], recete: [],
    fiyatKurallari: [{ id: "r1", tip: "Satış", kapsam: "fiyatGrubu", deger: "fgT", fiyat: 29.9, paraBirimi: "USD", etiket: "Grup: Toptan USD" },
      { id: "r2", tip: "Satış", kapsam: "fiyatGrubu", deger: "fgP", fiyat: 1599, paraBirimi: "TRY", etiket: "Grup: Perakende" },
      { id: "r3", tip: "Satış", kapsam: "cari", deger: "c1", fiyat: 999, paraBirimi: "TRY", etiket: "Cari: gizli" }] });
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  // v1.590.0: seçim Fiyat Listesi'nde ve BULUTTA (tanımlar). Kaynağı seç → "Katalogda göster".
  await sayfa.evaluate(() => document.querySelector('[data-nav="Fiyat Listesi"]').click());
  await sayfa.waitForTimeout(900);
  const kok = "[data-fiyat-listesi]";
  const katalogListesi = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fl-katalog-kaynak]")].map((x) => x.getAttribute("data-fl-katalog-kaynak")));
  const kaynakSecVeEkle = async (key) => {
    await sayfa.locator(`${kok} [data-fl-kaynak]`).first().selectOption(key);
    await sayfa.waitForTimeout(300);
    await sayfa.locator(`${kok} [data-fl-katalog]`).first().click();
    await sayfa.waitForTimeout(400);
  };
  const baslangic = { liste: await katalogListesi(), dugme: await sayfa.locator(`${kok} [data-fl-katalog]`).first().textContent() };
  await kaynakSecVeEkle("fgT");
  await kaynakSecVeEkle("fgP");
  const ucSecili = await katalogListesi();
  await kaynakSecVeEkle("fgA");   // 4. olmaz
  const dorduncuDenemesi = await katalogListesi();
  const bulut = ((await depoOku(sayfa, "tanimlar:data")) || {}).katalogFiyatKaynaklari;
  // Katalog
  await sayfa.evaluate(() => document.querySelector('[data-nav="Mamul Stok"]').click());
  await sayfa.waitForTimeout(800);
  await sayfa.locator('button:has-text("Katalog"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const kart = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-katalog-fiyat]")].map((x) => `${x.getAttribute("data-katalog-fiyat")}: ${x.textContent.replace(/\s+/g, " ").trim()}`));
  const uclu = await kart();
  const katalogOzeti = await sayfa.evaluate(() => [...document.querySelectorAll("[data-katalog-kaynak]")].map((x) => x.textContent.trim()));
  const cipTiklanabilir = await sayfa.evaluate(() => [...document.querySelectorAll("[data-katalog-kaynak]")].some((x) => x.tagName === "BUTTON"));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /27325 D/.test(x.textContent) && x.offsetParent); b.click(); });
  await sayfa.waitForTimeout(600);
  const detay = await sayfa.evaluate(() => [...document.querySelectorAll("[data-katalog-detay-fiyat]")].map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  const cariOzelGorunuyor = await sayfa.evaluate(() => /999/.test(document.body.innerText));
  // Perakende'yi kaldır, alışı ekle → personelde görünür, müşteri görünümünde gizli.
  await sayfa.evaluate(() => document.querySelector('[data-nav="Fiyat Listesi"]').click());
  await sayfa.waitForTimeout(700);
  await sayfa.locator(`${kok} [data-fl-katalog-kaldir="Perakende"]`).first().click();
  await sayfa.waitForTimeout(300);
  await kaynakSecVeEkle("fgA");
  const alisListesi = await katalogListesi();
  await sayfa.evaluate(() => document.querySelector('[data-nav="Mamul Stok"]').click());
  await sayfa.waitForTimeout(700);
  const alisPersonel = await kart();
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Personel görünümü"); b.click(); });
  await sayfa.waitForTimeout(300);
  const alisMusteri = await kart();
  const yerelKayit = await sayfa.evaluate(() => localStorage.getItem("katalog:fiyatKaynaklari"));
  await tarayici.close();
  return { hatalar, baslangic, ucSecili, dorduncuDenemesi, bulut, uclu, katalogOzeti, cipTiklanabilir, detay, cariOzelGorunuyor, alisListesi, alisPersonel, alisMusteri, yerelKayit };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
