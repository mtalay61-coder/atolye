// SENARYO — ÖZEL KOD ALANLARI RENKLER GİBİ ÇOK TİPLİ (10 Ekim, v1.636.0).
// Kullanıcı (Tanımlar ekran görüntüsü: Genel'de "Taban, MODEL", Sandalet'te "Taban, Kalıp, Maliyet, MODEL", Ayakkabı'da
// "Taban, Kalıp, TEDARİKÇİ"): "tipler renk gibi ortak olabilsin".
// Kurulum aynı yapıda; Sandalet ürününde Sandalet-Kalıp = "K-40", Ayakkabı ürününde Ayakkabı-Kalıp = "K-41".
// Ölçülen:
//   1) Tanımlar > Ürün: "aynı adlı N alan" uyarısı + Birleştir; birleştirince her ad tek satır, Kalıp'ın rozetlerinde
//      Sandalet ve Ayakkabı seçili, Taban ve MODEL Genel; ürünlerdeki Kalıp değerleri tek alana taşındı.
//   2) Rozete dokununca tip eklenir/çıkar (Kalıp → Çanta eklendi, sonra çıkarıldı).
//   3) Aynı adla yeni alan eklemek ("kalıp", Mamul tipi: Çanta) yeni satır açmaz, Çanta'yı Kalıp'a ekler.
const { uygulamaAc, depoOku, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir(ekran) {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.mamulTipleri = [{ id: "mt1", ad: "Sandalet" }, { id: "mt2", ad: "Ayakkabı" }, { id: "mt3", ad: "Çanta" }];
  const a = (id, ad, tur, kad) => ({ id, ad, kapsamTuru: tur, kapsamAd: kad });
  tan.ozelKodAlanlari = [
    a("g-t", "Taban", "genel", ""), a("g-m", "MODEL", "genel", ""),
    a("s-t", "Taban", "mamul", "Sandalet"), a("s-k", "Kalıp", "mamul", "Sandalet"), a("s-ml", "Maliyet", "mamul", "Sandalet"), a("s-m", "MODEL", "mamul", "Sandalet"),
    a("a-t", "Taban", "mamul", "Ayakkabı"), a("a-k", "Kalıp", "mamul", "Ayakkabı"), a("a-td", "TEDARİKÇİ", "mamul", "Ayakkabı"),
  ];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "us", ad: "Sandalet X", kategori: "Mamul", mamulTipi: "Sandalet", birim: "çift", variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], hareketler: [], recete: [], ozelKodlar: { "s-k": "K-40", "g-t": "T1" } });
  stok.push({ id: "ua", ad: "Ayakkabı Y", kategori: "Mamul", mamulTipi: "Ayakkabı", birim: "çift", variants: [{ renk: "Siyah", beden: "41", miktar: 0 }], hareketler: [], recete: [], ozelKodlar: { "a-k": "K-41", "a-t": "T2" } });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click(); await sayfa.waitForTimeout(600);
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-ozel-kod-alani]")].map((r) => {
    const sec = [...r.querySelectorAll('[data-ozel-kod-kapsam][data-secili="1"]')].map((b) => b.getAttribute("data-ozel-kod-kapsam"));
    return `${r.getAttribute("data-ozel-kod-alani")}: ${sec.length ? sec.join(", ") : (r.querySelector("[data-ozel-kod-genel]") ? "GENEL" : "?")}`;
  }));
  const sonuc = {};
  sonuc.once = { uyari: await sayfa.evaluate(() => { const e = document.querySelector("[data-ozel-kod-ikiz]"); return e ? Number(e.getAttribute("data-ozel-kod-ikiz")) : 0; }), satirSayisi: (await satirlar()).length };
  await sayfa.locator("[data-ozel-kod-birlestir]").first().click(); await sayfa.waitForTimeout(800);
  sonuc.birlesince = { satirlar: await satirlar(), uyariKalkti: !(await sayfa.locator("[data-ozel-kod-ikiz]").count()) };
  if (ekran) { const k = sayfa.locator("[data-ozel-kod-alani]").first().locator("xpath=../.."); await k.scrollIntoViewIfNeeded(); await k.screenshot({ path: ekran }); }
  const urunler = await depoOku(sayfa, "stok:items");
  const deger = (id) => ((urunler.find((u) => u.id === id) || {}).ozelKodlar) || {};
  sonuc.degerler = { sandalet: deger("us"), ayakkabi: deger("ua") };

  const kalip = sayfa.locator('[data-ozel-kod-alani="Kalıp"]').first();
  await kalip.locator('[data-ozel-kod-kapsam="mamul|Çanta"]').click(); await sayfa.waitForTimeout(400);
  const ekle = (await satirlar()).find((x) => x.startsWith("Kalıp"));
  await kalip.locator('[data-ozel-kod-kapsam="mamul|Çanta"]').click(); await sayfa.waitForTimeout(400);
  sonuc.rozet = { ekleyince: ekle, cikarinca: (await satirlar()).find((x) => x.startsWith("Kalıp")) };

  await sayfa.locator('input[placeholder="Örn. Kalınlık"]').first().fill("kalıp");
  await sayfa.locator('input[placeholder="Örn. Kalınlık"]').first().locator("xpath=following-sibling::select[1]").selectOption("mamul|Çanta");
  await sayfa.locator('button:has-text("Alan Ekle")').first().click(); await sayfa.waitForTimeout(500);
  sonuc.aynaAdlaEkleme = { satirSayisi: (await satirlar()).length, kalip: (await satirlar()).find((x) => x.startsWith("Kalıp")) };
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir(process.env.EKRAN).then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
