// SENARYO — STOK AÇILIŞINDA ÖZEL KOD ALANI EKLEME.
//
// Kullanıcı (6 Eylül): "Özel kodlar stok açılışında görünmüyor. Özel kodu burada stok açarken de
// ekleyebiliriz; eklediğimiz özel kod o stoğa ait olur."
//
// İki iddia:
//   1. Blok HER ZAMAN görünüyor — hiç alan tanımlanmamışken bile. Önceden boşsa hiç çizilmiyordu
//      ve özellik yok sanılıyordu; yeni bir kurulumda tam olarak bu oluyor.
//   2. Buradan eklenen alan SEÇİLİ TİPE ait oluyor; tip seçilmemişse Genel.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // Hiç özel kod alanı OLMAYAN bir kurulum — kullanıcının şikâyet ettiği başlangıç hâli.
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.ozelKodAlanlari = [];
  tan.hammaddeTipleri = [{ id: "ht1", ad: "Deri" }];
  t["tanimlar:data"] = JSON.stringify(tan);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Ürün Ekle"):visible').first().click();
  await sayfa.waitForTimeout(600);

  // 1. ALAN YOKKEN DE GÖRÜNÜYOR.
  const bosDurum = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      blokVar: /Özel Kodlar \(opsiyonel/.test(m),
      // Sebebi yazılı: kullanıcı "neden boş" diye sormasın.
      sebepYazili: /Henüz alan yok/.test(m),
      ekleDugmesi: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Alan Ekle"),
    };
  });

  // 2. TİP SEÇİLİNCE EKLENEN ALAN O TİPE AİT OLUYOR.
  // Kategori Hammadde'ye çevrilip malzeme tipi "Deri" seçiliyor.
  await sayfa.locator('button:has-text("Hammadde"):visible').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('select:has(option:text-is("Deri"))').first().selectOption({ label: "Deri" });
  await sayfa.waitForTimeout(500);

  await sayfa.locator('button:has-text("Alan Ekle"):visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('input[placeholder="Örn. Taban"]:visible').fill("Kalınlık");
  await sayfa.waitForTimeout(200);
  // Onay düğmesi girdinin hemen yanındaki tik.
  await sayfa.evaluate(() => {
    const giris = [...document.querySelectorAll("input")].find((i) => i.placeholder === "Örn. Taban");
    if (giris && giris.nextSibling) giris.nextSibling.click();
  });
  await sayfa.waitForTimeout(900);

  const tanimSonrasi = await depoOku(sayfa, "tanimlar:data");
  const eklenen = ((tanimSonrasi || {}).ozelKodAlanlari || [])[0] || {};
  const alanKaydi = {
    ad: eklenen.ad,
    kapsamTuru: eklenen.kapsamTuru,
    kapsamAd: eklenen.kapsamAd,
    // Kimlik atanmış olmalı: değerler ada değil KİMLİĞE bağlanıyor.
    kimlikVar: !!eklenen.id,
  };

  // Eklenen alan formda ANINDA kutu olarak belirmeli; belirmezse kullanıcı "eklendi mi?" der.
  const formdaGorundu = await sayfa.evaluate(() => /Kalınlık/.test(document.body.innerText));

  // ---- 3. ÜRÜN KARTINDAN DA EKLENEBİLMELİ ------------------------------------------------------
  //
  // Aynı işi iki ekrandan birinde yapabilmek, "hangi ekranda ne yapabiliyorum" diye hatırlamayı
  // gerektiriyordu. Kartta açılan alanın kapsamı ÜRÜNÜN KENDİ TİPİNDEN geliyor.
  await sayfa.locator('button:has-text("Vazgeç"):visible').first().click().catch(() => {});
  await sayfa.waitForTimeout(500);
  // Tohumdaki "Deri" ürünü — malzeme tipi atanmamış, yani karttan eklenen alan GENEL olmalı.
  // "Deri" adı ekranda birkaç yerde geçiyor (malzeme tipi çipi, seçenek listesi). Ürün SATIRI,
  // içinde "renk/beden" yazan düğme — onu adıyla değil ŞEKLİYLE buluyoruz.
  await sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("button")]
      .find((b) => /renk\/beden/.test(b.textContent) && /^Deri/.test(b.textContent.trim()));
    if (satir) satir.click();
  });
  await sayfa.waitForTimeout(1500);
  // DİKKAT: "Özel Kodlar" adında iki düğme var — biri Tanımlar ekranının sekmesi (o ekran
  // display:none olduğu için GÖRÜNMEZ), biri ürün kartınınki. Ayrım görünürlükle yapılıyor.
  await sayfa.locator('button:has-text("Özel Kodlar"):visible').first().click();
  await sayfa.waitForTimeout(600);

  const karttaEkleme = await sayfa.evaluate(() => ({
    ekleDugmesi: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Alan Ekle"),
  }));

  await sayfa.locator('button:has-text("Alan Ekle"):visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('input[placeholder="Örn. Taban"]:visible').fill("Sezon Notu");
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => {
    const giris = [...document.querySelectorAll("input")].find((i) => i.placeholder === "Örn. Taban");
    if (giris && giris.nextSibling) giris.nextSibling.click();
  });
  await sayfa.waitForTimeout(900);

  const tanimSon = await depoOku(sayfa, "tanimlar:data");
  const karttanEklenen = ((tanimSon || {}).ozelKodAlanlari || []).find((a) => a.ad === "Sezon Notu") || {};

  await tarayici.close();
  return {
    hatalar, bosDurum, alanKaydi, formdaGorundu, karttaEkleme,
    karttanEklenen: { ad: karttanEklenen.ad, kapsamTuru: karttanEklenen.kapsamTuru, kimlikVar: !!karttanEklenen.id },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
