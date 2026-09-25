// SENARYO — GÖRSEL DEPOSU (yerel anahtar ayrımı).
//
// Görseller ürün kaydının içindeyken bütün ürünler tek yerel anahtarda (`stok:items`) toplanıyordu
// ve `guvenliYaz` 5 MB'ı aşan kaydı depoya sormadan reddediyor. Doldurduğunda STOK KAYDEDİLEMEZ
// hâle geliyordu — özellik kaybı değil, çalışmayı durduran bir hata.
//
// Ölçülen üç şey:
//   1. `stok:items` görselsiz yazılıyor (asıl kazanç).
//   2. Görseller ayrı anahtarlarda ve ürüne geri BİRLEŞİYOR — ekranda görünüyorlar.
//   3. Yeniden yüklemede kaybolmuyorlar.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // Gerçekçi boyutta bir görsel: telefon fotoğrafı 480 px'e indirildikten sonra ~40-60 KB.
  const buyukGorsel = `data:image/jpeg;base64,${"A".repeat(45000)}`;
  const stok = JSON.parse(t["stok:items"]);
  stok[1].kapakResmi = buyukGorsel;
  stok[1].renkResimleri = { Siyah: buyukGorsel, Taba: buyukGorsel };
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Bir kaydetme tetikle: stok ekranından ürüne dokunmadan, tohumdaki görselli ürünü açıp kapat
  // yetmez — yazma yolu ancak saveStok çağrılınca çalışır. Ürün adını değiştirmek en kısa yol.
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("button")]
      .find((b) => /renk\/beden/.test(b.textContent) && /^Bot/.test(b.textContent.trim()));
    if (satir) satir.click();
  });
  await sayfa.waitForTimeout(1200);

  // Görsel ekranda gerçekten var mı — birleştirme çalışıyor mu.
  const gorselEkranda = await sayfa.evaluate(() => {
    const imgler = [...document.querySelectorAll("img")].map((i) => i.src || "");
    return imgler.some((s) => s.startsWith("data:image/jpeg;base64,AAAA"));
  });

  // KAYDETMEYİ TETİKLE. Ayrım yalnızca `saveStok` çalışınca oluşuyor; açılışta okunan hâl
  // henüz eski biçimde. Ürünü pasife almak en kısa ve yan etkisi en az olan yazma yolu
  // (kayıt, stok ve geçmiş durur; yalnız yeni işlemlerde seçilemez).
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /kullan\u0131mdan kald\u0131r/i.test(x.title || ""));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);

  const olcum = await sayfa.evaluate(() => {
    const d = window.__depo || {};
    const gorselAnahtarlari = Object.keys(d).filter((k) => k.startsWith("gorsel:"));
    const stokMetni = d["stok:items"] || "";
    return {
      gorselAnahtariVar: gorselAnahtarlari.length > 0,
      // ASIL KAZANÇ: dev görsel `stok:items` içinde OLMAMALI.
      stokKaydindaGorselYok: !stokMetni.includes("AAAAAAAAAA"),
      // Ama ayrı anahtarda OLMALI.
      gorselAyriAnahtarda: gorselAnahtarlari.some((k) => (d[k] || "").includes("AAAAAAAAAA")),
      stokBoyutuKB: Math.round(stokMetni.length / 1024),
    };
  });

  // ---- YENİDEN AÇILIŞTA KAYBOLMAMALI -----------------------------------------------------------
  //
  // Asıl risk bu: `stok:items` artık görselsiz, dolayısıyla birleştirme çalışmazsa görseller
  // SESSİZCE kaybolur ve kullanıcı ancak katalogda boş kareler görünce fark eder.
  //
  // Gerçek `reload()` ölçüm yapmıyor: test altyapısı depoyu `addInitScript` ile kuruyor ve
  // yeniden yükleme ORİJİNAL tohumu geri koyuyor. Onun yerine BÖLÜNMÜŞ depo ikinci bir uygulamaya
  // veriliyor — "kaydedilmiş hâlden açılış" tam olarak bu.
  const bolunmusDepo = await sayfa.evaluate(() => ({ ...window.__depo }));
  await tarayici.close();

  const ikinci = await uygulamaAc(bolunmusDepo, { hataYaz: false });
  await ikinci.sayfa.waitForTimeout(2400);
  await modulAc(ikinci.sayfa, "Mamul Stok");
  await ikinci.sayfa.waitForTimeout(700);
  await ikinci.sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("button")]
      .find((b) => /renk\/beden/.test(b.textContent) && /^Bot/.test(b.textContent.trim()));
    if (satir) satir.click();
  });
  await ikinci.sayfa.waitForTimeout(1200);
  const yenidenAcilis = {
    gorselGeriGeldi: await ikinci.sayfa.evaluate(() =>
      [...document.querySelectorAll("img")].some((i) => (i.src || "").startsWith("data:image/jpeg;base64,AAAA"))),
    stokKaydiHalaGorselsiz: await ikinci.sayfa.evaluate(() =>
      !((window.__depo || {})["stok:items"] || "").includes("AAAAAAAAAA")),
  };
  await ikinci.tarayici.close();

  return { hatalar, gorselEkranda, olcum, yenidenAcilis };

}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
