// SENARYO — SİPARİŞTE KALEM PARA BİRİMİ CARİNİN PARA BİRİMİYLE GELİR (v1.744.27, kullanıcı 20 Kasım).
//
//   "Siparişte cari seçildiğinde cariye seçilen para tipi ile sipariş açılsın ve eklenen siparişler de o cari para tipi ile
//    girilsin."
//
// Ölçülen (yeni satış siparişi formu, Kalem Ekle satırındaki para birimi kutusu):
//   - cari seçilmeden: TRY
//   - USD carisi seçilince: USD · EUR carisine geçince: EUR · TL carisine geçince: TRY
//   - elle değiştirme korunur (aynı cari kalırken kutu elle EUR yapılırsa EUR kalır); USD carisine geçilince yine USD
//     (eski kodda elle seçilen EUR kalırdı — kaydedilen kalem ölçümü bu yüzden ayırt edici)
//   - eklenen kalem o para birimiyle kaydedilir (form içindeki kalem satırının para birimi)
const { uygulamaAc, modulAc, cariSec, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]);
  t["cari:data"] = JSON.stringify([
    ...cariler.map((c) => (c.id === "c2" ? { ...c, paraBirimi: "USD" } : c)),
    { ...cariler.find((c) => c.id === "c2"), id: "c4", unvan: "Müşteri Avro", paraBirimi: "EUR" },
    { ...cariler.find((c) => c.id === "c2"), id: "c5", unvan: "Müşteri Lira", paraBirimi: "TRY" },
  ]);
  // Kalem ekleme için barkodlu mamul (senaryo-barkod-siparis ile aynı kurulum): 125 Model, Siyah, 36–40
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: 10 })), hareketler: [], recete: [], birimFiyat: 465 });
  t["stok:items"] = JSON.stringify(stok);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // Kalem Ekle satırındaki para birimi kutusu: "Birim Fiyat" kutusunun hemen yanındaki, TRY / USD / EUR seçenekli görünür select
  const kalemPB = () => sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].filter((x) => x.getBoundingClientRect().height > 0
      && [...x.options].some((o) => o.value === "TRY") && [...x.options].some((o) => o.value === "USD"));
    return s.length ? s[0].value : null;
  });

  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);
  const urun = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m125");
  const tanS = await depoOku(sayfa, "tanimlar:data");
  const hane = (n, h) => String(n).padStart(h, "0");
  const kod38 = `90${hane(urun.stokNo, 4)}${hane(((tanS.renkler || []).find((r) => r.ad === "Siyah") || {}).barkodKodu, 4)}${hane(((tanS.bedenler || []).find((b) => b.ad === "38") || {}).barkodKodu, 2)}`;

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);

  const sonuc = {};
  sonuc.cariYok = await kalemPB();
  await cariSec(sayfa, "Müşteri B"); await sayfa.waitForTimeout(400);
  sonuc.usdCari = await kalemPB();
  await cariSec(sayfa, "Müşteri Avro"); await sayfa.waitForTimeout(400);
  sonuc.eurCari = await kalemPB();
  await cariSec(sayfa, "Müşteri Lira"); await sayfa.waitForTimeout(400);
  sonuc.tlCari = await kalemPB();
  // elle değiştirme: aynı cari kalırken kutu EUR yapılır → EUR kalmalı
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => x.getBoundingClientRect().height > 0
      && [...x.options].some((o) => o.value === "TRY") && [...x.options].some((o) => o.value === "USD"));
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    set.call(s, "EUR"); s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  sonuc.elleEurKalir = await kalemPB();
  // USD carisine dönülünce kutu yine carinin para birimi
  await cariSec(sayfa, "Müşteri B"); await sayfa.waitForTimeout(400);
  sonuc.usdCariyeDonus = await kalemPB();

  // KALEM EKLE (USD carisi seçili): 38 numaraya bir çift barkodla → sipariş kaydedilir → kayıtlı kalemin para birimi
  await sayfa.locator("[data-barkod-paneli-ac]:visible").first().click();
  await sayfa.waitForTimeout(200);
  const kutu = sayfa.locator('input[title="Barkod"]:visible').first();
  await kutu.fill(kod38); await kutu.press("Enter");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Siparişi Kaydet"):visible').first().click();
  await sayfa.waitForTimeout(1800);
  const yeni = ((await depoOku(sayfa, "siparis:data")) || []).find((sp) => (sp.kalemler || []).some((k) => k.urunId === "m125"));
  sonuc.kaydedilenSiparis = yeni ? { cari: yeni.cariId, kalemler: yeni.kalemler.filter((k) => k.urunId === "m125").map((k) => ({ beden: k.beden, miktar: k.miktar, paraBirimi: k.paraBirimi })) } : null;
  sonuc.hatalar = hatalar;

  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
