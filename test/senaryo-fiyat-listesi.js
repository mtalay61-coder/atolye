// SENARYO — FİYAT LİSTESİ (v1.550.0).
//
// Kullanıcı: "Toptan TL fiyat seçip filtreleyince modellerin Toptan TL fiyatları çıkmalı, fiyat yoksa boş
// göstermeli, aynı ekrandan girip düzeltilebilmeli ve kaydedilebilmeli. Farklı kaydet de olmalı: Toptan TL
// %14 + ya da 10 TL indirim gibi pratik şekilde başka fiyat grubu oluşturalım."
//   1. Toptan TL seçili: Bot 400, Çizme BOŞ.
//   2. Çizme'ye 300 yazılıp Kaydet → kural yazılır.
//   3. %14 artır, 5'e yuvarla → Yeni fiyat sütunu (455 / 340); Farklı kaydet → "Toptan TL +14" grubu oluşur,
//      fiyatlar oraya yazılır, Toptan TL değişmez; ekran yeni gruba geçer.
//   4. Yeni gruptan 10 TL indirim → "Bu listeye uygula" → Kaydet.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.fiyatGruplari = [{ id: "g1", ad: "Toptan TL", tip: "Satış", paraBirimi: "TRY" }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.fiyatKurallari = [{ id: "k1", kapsam: "fiyatGrubu", deger: "g1", tip: "Satış", fiyat: 400, paraBirimi: "TRY", etiket: "Toptan TL" }];
  stok.push({ ...bot, id: "u3", ad: "Çizme", stokNo: "", fiyatKurallari: [], hareketler: [], variants: bot.variants.map((v) => ({ ...v, miktar: 0 })) });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Fiyat Listesi");
  await sayfa.waitForTimeout(500);
  const kok = '[data-fiyat-listesi]';
  const deger = (ad) => sayfa.locator(`${kok} [data-fl-fiyat="${ad}"]`).first().inputValue();
  const yeniSutun = (ad) => sayfa.evaluate((a) => ((document.querySelector(`[data-fl-yeni="${a}"]`) || {}).textContent || "").trim(), ad);
  const grupFiyati = async (id, grup) => {
    const u = (await depoOku(sayfa, "stok:items")).find((x) => x.id === id);
    const k = (u.fiyatKurallari || []).find((x) => x.kapsam === "fiyatGrubu" && x.deger === grup && !x.renk);
    return k ? `${k.fiyat} ${k.paraBirimi}` : "yok";
  };

  // 1) İlk görünüm
  const ilk = { kaynak: await sayfa.locator(`${kok} [data-fl-kaynak]`).first().inputValue(), bot: await deger("Bot"), cizme: await deger("Çizme") };

  // 2) Boş fiyatı yaz + kaydet
  await sayfa.locator(`${kok} [data-fl-fiyat="Çizme"]`).first().fill("300");
  await sayfa.waitForTimeout(200);
  const degisenSayi = await sayfa.locator(`${kok} [data-fl-degisen]`).first().getAttribute("data-fl-degisen");
  await sayfa.locator(`${kok} [data-fl-kaydet]`).first().click();
  await sayfa.waitForTimeout(600);
  const kayit = { cizme: await grupFiyati("u3", "g1"), cubukKalkti: (await sayfa.locator(`${kok} [data-fl-degisen]`).count()) === 0 };

  // 3) %14 + 5'e yuvarla → farklı kaydet
  await sayfa.locator(`${kok} [data-fl-deger]`).first().fill("14");
  await sayfa.locator(`${kok} [data-fl-adim]`).first().selectOption("5");
  await sayfa.waitForTimeout(200);
  const onizleme = { bot: await yeniSutun("Bot"), cizme: await yeniSutun("Çizme") };
  await sayfa.locator(`${kok} [data-fl-farkli-ac]`).first().click();
  await sayfa.locator(`${kok} [data-fl-yeni-ad]`).first().fill("Toptan TL +14");
  await sayfa.locator(`${kok} [data-fl-farkli-kaydet]`).first().click();
  await sayfa.waitForTimeout(700);
  const gruplar = ((await depoOku(sayfa, "tanimlar:data")).fiyatGruplari || []).map((g) => `${g.ad}:${g.tip}:${g.paraBirimi}`);
  const yeniId = ((await depoOku(sayfa, "tanimlar:data")).fiyatGruplari || []).find((g) => g.ad === "Toptan TL +14").id;
  const farkli = {
    yeniBot: await grupFiyati("u2", yeniId), yeniCizme: await grupFiyati("u3", yeniId),
    eskiBot: await grupFiyati("u2", "g1"),
    ekranKaynak: await sayfa.locator(`${kok} [data-fl-kaynak] option:checked`).first().textContent(),
    ekranBot: await deger("Bot"),
  };

  // 4) 10 TL indirim → listeye uygula → kaydet
  await sayfa.locator(`${kok} [data-fl-yon="-1"]`).first().click();
  await sayfa.locator(`${kok} [data-fl-tur="tutar"]`).first().click();
  await sayfa.locator(`${kok} [data-fl-adim]`).first().selectOption("0.01");
  await sayfa.locator(`${kok} [data-fl-deger]`).first().fill("10");
  await sayfa.waitForTimeout(200);
  await sayfa.locator(`${kok} [data-fl-listeye-al]`).first().click();
  await sayfa.waitForTimeout(200);
  const listede = { bot: await deger("Bot"), degisen: await sayfa.locator(`${kok} [data-fl-degisen]`).first().getAttribute("data-fl-degisen") };
  await sayfa.locator(`${kok} [data-fl-kaydet]`).first().click();
  await sayfa.waitForTimeout(600);
  const indirim = { bot: await grupFiyati("u2", yeniId), cizme: await grupFiyati("u3", yeniId), gecmis: ((await depoOku(sayfa, "stok:items")).find((x) => x.id === "u2").fiyatGecmisi || []).length };
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });

  await tarayici.close();
  return { ilk, degisenSayi, kayit, onizleme, gruplar, farkli, listede, indirim, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
