// SENARYO — STOK RESMİNE DAMGA (6 Ekim, v1.604.0).
// Kullanıcı: "Stok resmi eklediğimizde sağ üste logomuz, altına stok kodu, altına renk kodu yazdırabilir miyiz?"
// Ölçülen:
//   1) resmeDamgaVur (doğrudan): kırmızı 300×200 resim + mavi logo → sağ üstte logo bölgesi mavi, hemen altındaki yazı
//      kutusu açık (beyaz zemin), sol alt köşe hâlâ kırmızı; logosuz çağrıda yalnız yazı; satır yoksa resim aynen.
//   2) Stok › Ürün Ekle: ad "Damga Test", kapak resmi dosyadan yüklenir → kaydedilen kapakResmi damgalı (sağ üst mavi,
//      sol alt kırmızı). Tanımlar'da tik kapalıysa `stokResmiDamgasi` undefined döner. Sayfa hatası yok.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  // Mavi 60×30 logo (veri URL'si tarayıcıda üretilemiyor; küçük bir PNG'yi canvas ile sayfada kuracağız — burada yer tutucu).
  t["tanimlar:data"] = JSON.stringify(tan);
  const ilk = await uygulamaAc(t, { hataYaz: false });
  const tarayici = ilk.tarayici; let sayfa = ilk.sayfa;
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // Sayfada görseller: kırmızı resim, mavi logo.
  const { kirmizi, mavi } = await sayfa.evaluate(() => {
    const kur = (w, h, renk) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = renk; x.fillRect(0, 0, w, h); return c.toDataURL("image/png"); };
    return { kirmizi: kur(300, 200, "#ff0000"), mavi: kur(60, 30, "#0000ff") };
  });
  const ornekle = (dataUrl) => sayfa.evaluate((src) => new Promise((cozul) => {
    const im = new Image(); im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
      const px = (a, b) => { const d = x.getImageData(a, b, 1, 1).data; return d[0] > 180 && d[1] < 80 && d[2] < 80 ? "kirmizi" : d[2] > 180 && d[0] < 80 ? "mavi" : d[0] > 200 && d[1] > 200 && d[2] > 200 ? "acik" : "diger"; };
      const w = im.width, h = im.height, kenar = Math.round(w * 0.03), lw = Math.round(w * 0.22);
      cozul({ boyut: `${w}x${h}`, sagUstLogo: px(w - kenar - Math.round(lw / 2), kenar + 8), logoAlti: px(w - kenar - 1, kenar + Math.round(lw / 2) + 8 + Math.round(w * 0.015) + 6), solAlt: px(5, h - 5) });
    }; im.src = src;
  }), dataUrl);

  const damgali = await sayfa.evaluate(([src, logo]) => window.__resimDamga.resmeDamgaVur(src, { logo, satirlar: ["27322 D", "1031 - Kırmızı"] }), [kirmizi, mavi]);
  const logosuz = await sayfa.evaluate(([src]) => window.__resimDamga.resmeDamgaVur(src, { logo: "", satirlar: ["27322 D"] }), [kirmizi]);
  const bos = await sayfa.evaluate(([src]) => window.__resimDamga.resmeDamgaVur(src, { logo: "", satirlar: [] }), [kirmizi]);
  const dogrudan = { damgali: await ornekle(damgali), logosuz: await ornekle(logosuz), bosAynen: bos === kirmizi,
    tikKapali: await sayfa.evaluate(() => window.__resimDamga.stokResmiDamgasi({ logo: "x", resimDamgasi: false }, ["a"]) === undefined),
    varsayilan: await sayfa.evaluate(() => JSON.stringify(window.__resimDamga.stokResmiDamgasi({ logo: "L" }, ["27322 D", "", "Siyah"]))) };

  await tarayici.close();

  // 2) Stok formundan dosya yükleme — logo Tanımlar'da (tohumla): ikinci açılış.
  const t2 = { ...TOHUM };
  const tan2 = JSON.parse(t2["tanimlar:data"]);
  tan2.firmaBilgileri = { ...(tan2.firmaBilgileri || {}), logo: mavi };
  t2["tanimlar:data"] = JSON.stringify(tan2);
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  const sayfa2 = ikinci.sayfa;
  sayfa2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa2.waitForTimeout(2200);
  sayfa = sayfa2;
  await modulAc(sayfa, "Stok"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const l = [...document.querySelectorAll("label")].find((x) => /^Ürün Adı/.test(x.textContent.trim()));
    const i = l && l.querySelector("input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, "Damga Test"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);
  // Kapak resmi kutusu: "Kapak Resmi" başlığının yanındaki swatch → düzenleme paneli; dosya girdisi o panelin içinde.
  const kapakKutu = sayfa.locator('xpath=//div[normalize-space(text())="Kapak Resmi"]/following-sibling::span//button[@data-gorsel-kutu]').first();
  await kapakKutu.click();
  await sayfa.waitForTimeout(400);
  const png = Buffer.from(kirmizi.split(",")[1], "base64");
  const dosyaGirdisi = sayfa.locator('xpath=//div[normalize-space(text())="Kapak Resmi"]/following-sibling::span//input[@type="file" and not(@capture)]').first();
  await dosyaGirdisi.setInputFiles({ name: "kirmizi.png", mimeType: "image/png", buffer: png });
  await sayfa.waitForTimeout(1200);
  if (process.env.HATA_AYIKLA) { console.error("kutu:", await kapakKutu.getAttribute("data-gorsel-kutu"), "hata:", await sayfa.evaluate(() => document.body.innerText.includes("okunamadı"))); await sayfa.screenshot({ path: "/tmp/claude-0/-home-user-atolye/538bd082-f3de-575a-a5ff-119a8c0039a9/scratchpad/damga-dbg.png" }); }
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Matris Oluştur/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  // Formun Kaydet'i (btn-save): swatch panelinin kendi "Kaydet"i de var, ad eşleşmesi ona takılmasın.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button.btn-save")].find((x) => /Kaydet/.test(x.textContent) && x.getBoundingClientRect().width > 0 && !x.disabled); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);
  // Stok kaydı görselsiz saklanır (v1.548): görsel ayrı `gorsel:` anahtarında. Yeni ürünün görselini oradan okuyoruz.
  const u = (await depoOku(sayfa, "stok:items")).find((x) => x.ad === "Damga Test");
  const kapak = u ? await sayfa.evaluate((id) => {
    const d = window.__depo || {};
    const k = Object.keys(d).find((x) => x.startsWith("gorsel:") && x.includes(id));
    if (!k) return "";
    try { const v = JSON.parse(d[k]); return v.kapakResmi || (typeof v === "string" ? v : ""); } catch (e) { return d[k].startsWith("data:") ? d[k] : ""; }
  }, u.id) : "";
  const form = kapak ? await ornekle(kapak) : (u ? "kapak yok" : "ürün yok");
  await ikinci.tarayici.close();
  return { dogrudan, form, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
