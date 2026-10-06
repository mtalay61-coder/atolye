// SENARYO — FİYAT LİSTESİNDE BİRİM UYUMSUZLUĞU (6 Ekim, v1.600.0).
// Kullanıcı: "VOOG özel fiyat TL idi, USD olarak değiştirdim ama para birimi değişmedi ve değiştirilemiyor."
// Grup $ ama kurallar ₺ kayıtlı. Ölçülen:
//   1) Grup seçilince turuncu şerit: 2 ürün ₺ kayıtlı; satır kutuları ₺.
//   2) Bot'un satır seçicisi $ → kural 1349 USD; şerit 1'e düşer (Çizme).
//   3) "Kurla $'ye çevir" → Çizme 1349 ₺ / 48 = 28,10 $; şerit kalkar.
//   4) Bot'un satır seçicisi € → kural EUR, rakam aynı; şerit geri gelir (grup $, Bot €).
//   5) "Birimi $ yap (rakam aynı)" → Bot 1349 USD; şerit yok. Sayfa hatası yok.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.fiyatGruplari = [{ id: "g1", ad: "VOOG Özel", tip: "Satış", paraBirimi: "USD" }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.fiyatKurallari = [{ id: "k1", kapsam: "fiyatGrubu", deger: "g1", tip: "Satış", fiyat: 1349, paraBirimi: "TRY", etiket: "VOOG Özel" }];
  stok.push({ ...bot, id: "u3", ad: "Çizme", stokNo: "", hareketler: [], variants: bot.variants.map((v) => ({ ...v, miktar: 0 })),
    fiyatKurallari: [{ id: "k2", kapsam: "fiyatGrubu", deger: "g1", tip: "Satış", fiyat: 1349, paraBirimi: "TRY", etiket: "VOOG Özel" }] });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Fiyat Listesi");
  await sayfa.waitForTimeout(500);
  const kok = "[data-fiyat-listesi]";
  await sayfa.locator(`${kok} [data-fl-kaynak]`).first().selectOption("g1");
  await sayfa.waitForTimeout(400);
  const serit = () => sayfa.evaluate(() => { const e = document.querySelector("[data-fl-birim-uyari]"); return e ? e.getAttribute("data-fl-birim-uyari") : "yok"; });
  const satirPb = (ad) => sayfa.locator(`${kok} [data-fl-pb="${ad}"]`).first().inputValue();
  const kural = async (id) => {
    const u = (await depoOku(sayfa, "stok:items")).find((x) => x.id === id);
    const k = (u.fiyatKurallari || []).find((x) => x.kapsam === "fiyatGrubu" && x.deger === "g1");
    return k ? `${k.fiyat} ${k.paraBirimi}` : "yok";
  };
  const ilk = { serit: await serit(), bot: await satirPb("Bot"), cizme: await satirPb("Çizme") };

  await sayfa.locator(`${kok} [data-fl-pb="Bot"]`).first().selectOption("USD");
  await sayfa.waitForTimeout(500);
  const satirdan = { serit: await serit(), bot: await kural("u2"), botKutu: await satirPb("Bot") };

  await sayfa.locator(`${kok} [data-fl-birim-cevir]`).first().click();
  await sayfa.waitForTimeout(600);
  const kurla = { serit: await serit(), cizme: await kural("u3"), cizmeKutu: await sayfa.locator(`${kok} [data-fl-fiyat="Çizme"]`).first().inputValue() };

  await sayfa.locator(`${kok} [data-fl-pb="Bot"]`).first().selectOption("EUR");
  await sayfa.waitForTimeout(500);
  const euro = { serit: await serit(), bot: await kural("u2") };

  await sayfa.locator(`${kok} [data-fl-birim-esitle]`).first().click();
  await sayfa.waitForTimeout(600);
  const esitle = { serit: await serit(), bot: await kural("u2"), cizme: await kural("u3") };
  const gecmis = ((await depoOku(sayfa, "stok:items")).find((x) => x.id === "u2").fiyatGecmisi || []).slice(0, 3).map((g) => `${g.eskiParaBirimi}→${g.paraBirimi} ${g.yeniFiyat}`);

  await tarayici.close();
  return { ilk, satirdan, kurla, euro, esitle, gecmis, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
