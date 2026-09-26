// SENARYO — YENİ RENGE RENK KODU, "STANDART" YER TUTUCU, ÜRÜN SEÇİCİDE RESİM (26 Eylül, v1.467.0).
//
// Kullanıcı (üç ekran görüntüsü): "Renk kodunu otomatik veriyor, burada vermemiş — stok kartı
// içerisinden açılan renk bu; tüm açılan renklere otomatik renk kodu versin. Standart'ı kaldırmıştık,
// burada yine çıktı. Siparişte ürün girerken resim de göstersin."
//
// Ölçülenler:
//   1. Açılışta kodsuz kalmış eski renk (Gümüş) barkod kodu alıyor.
//   2. Ürün kartından "Listede yok, yeni renk" ile açılan renk anında barkod kodu alıyor.
//   3. Yalnız renkli (beden "Standart") ürüne beden grubu eklenince Standart sütunu kalkıyor;
//      üzerinde stok olan Standart kalıyor (sessizce silinmez).
//   4. Siparişte ürün seçicide resmi olan üründe küçük resim, olmayanda ikon.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const RESIM = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#a67c52"/></svg>');

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  // Eski kayıt: barkod kodu olmayan renk.
  tanim.renkler = [...(tanim.renkler || []).map((r) => ({ ...r, barkodKodu: r.barkodKodu || undefined })), { id: "r-gumus", ad: "Gümüş", tip: "Mamul", kod: "116" }];
  tanim.bedenGruplari = [{ id: "bg1", ad: "36-38", bedenler: ["36", "37", "38"] }];
  tanim.bedenler = [...(tanim.bedenler || []), ...["36", "37", "38"].filter((b) => !(tanim.bedenler || []).some((x) => x.ad === b)).map((b) => ({ id: `b${b}`, ad: b, tip: "Beden" }))];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push(
    { id: "yeni1", ad: "Yeni Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", kapakResmi: RESIM,
      variants: [{ renk: "Siyah", beden: "Standart", miktar: 0, minStok: 0 }], hareketler: [] },
    { id: "yeni2", ad: "Stoklu Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Siyah", beden: "Standart", miktar: 3, minStok: 0 }], hareketler: [{ id: "sh1", tarih: "2026-09-01", renk: "Siyah", beden: "", miktar: 3 }] },
  );
  t["stok:items"] = JSON.stringify(stok);

  // Bulut okuma yolu (kod tamamlama yalnız buluttan okununca) testte yerel depodan geliyor; bu
  // yüzden 1. ölçüm "ilk tanım yazımından sonra" okunuyor — yazma yolu da aynı `kodlariAta`dan geçiyor.
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  const urunAc = async (ad) => {
    await modulAc(sayfa, "Mamul Stok");
    await sayfa.waitForTimeout(600);
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };
  const tikla = (m) => sayfa.evaluate((m) => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === m); if (b) b.click(); return !!b; }, m);
  const kapat = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].filter((x) => x.offsetParent && x.textContent.trim() === "Kapat").pop(); if (b) b.click(); });

  // 2. Ürün kartından yeni renk ("Listede Yok, Yeni Renk Ekle").
  await urunAc("Yeni Model");
  await tikla("Renk Ekle");
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Listede Yok, Yeni Renk Ekle/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(200);
  await sayfa.locator('input[placeholder="Yeni renk"]').fill("Bakır");
  await sayfa.evaluate(() => { const i = document.querySelector('input[placeholder="Yeni renk"]'); const b = [...i.parentElement.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ekle"); b.click(); });
  await sayfa.waitForTimeout(900);
  const tanimSonra = await depoOku(sayfa, "tanimlar:data");
  const kod = (ad) => { const r = (tanimSonra.renkler || []).find((x) => x.ad === ad); return r ? (r.barkodKodu > 0 ? "var" : "yok") : "renk yok"; };
  const renkKodlari = { yeniRenk: kod("Bakır"), eskiKodsuz: kod("Gümüş") };

  // 3. Beden grubu ekle → Standart sütunu kalkıyor.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Beden Ekle"); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-beden-grup-ekle="36-38"]').first().click();
  await sayfa.waitForTimeout(900);
  await kapat();
  await sayfa.waitForTimeout(400);
  await urunAc("Stoklu Model");
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Beden Ekle"); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-beden-grup-ekle="36-38"]').first().click();
  await sayfa.waitForTimeout(900);
  const stokSonra = await depoOku(sayfa, "stok:items");
  const bedenler = (ad) => [...new Set(((stokSonra || []).find((p) => p.ad === ad) || {}).variants.map((v) => v.beden))];
  const standart = { yeniModel: bedenler("Yeni Model"), stokluModel: bedenler("Stoklu Model") };
  await kapat();

  // 4. Siparişte ürün seçici.
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Yeni Sipariş/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const kutu = sayfa.locator('input[placeholder="Model ara…"]:visible').first();
  await kutu.click();
  await kutu.type("model");
  await sayfa.waitForTimeout(300);
  const secici = await sayfa.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent && /Model/.test(b.textContent) && b.querySelector("span"))
    .map((b) => `${b.textContent.trim().split(/\s{2,}/)[0].replace(/Çift|çift/, "").trim()}: ${b.querySelector("[data-urun-secici-resim]") ? "resim" : "ikon"}`));

  await tarayici.close();
  return { hatalar, renkKodlari, standart, secici };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
