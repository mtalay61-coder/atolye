// SENARYO — FOTOĞRAFTAN ÜRÜN TANIMA: SİPARİŞ VE DEPO (24 Eylül, v1.439.0).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "Siparişte kamera ile barkod okumaya ilave, kamera ile ürün okuma da olsun. Ürünü
// fotoğrafından tanıyıp sipariş alalım. Barkodsuz ürünün fotoğrafından ürünün ne olduğunu tanısın.
// Bunu depoda da kullanabiliriz."
// Mevcut `GorselIleBul` (118) yeniden kullanıldı: KULLANICININ KENDİ ürün görselleriyle, cihazın
// içinde karşılaştırma (renk histogramı + aHash); dışarıya hiçbir şey gitmiyor, sonuç ÖNERİ.
//
// Görseller: iki ayırt edilebilir ürün (koyu/dikey "Foto Model A" · Siyah, açık/yatay "Foto Model B"
// · Taba) ve görseli OLMAYAN Bot. Fotoğraf, A'nın kayıtlı görselinin BOZULMUŞ hâli (ölçek +
// bulanıklık + parlaklık + tezgâh arka planı) — "aynı ürünün başka fotoğrafı".
//
// Ölçülenler:
//   1. SİPARİŞ (Satış): "Fotoğraftan bul" barkod panelinde; havuz satışta MAMULLER (hammadde Deri
//      aday listesinde YOK); doğru ürün İLK sırada; görselsiz aday sessizce atılmıyor ("görseli yok").
//   2. Seçim kalem alanını DOLDURUYOR (ürün + renk, "Foto Model A · Siyah seçildi"), kalemi
//      kendiliğinden EKLEMİYOR (formda kalem satırı yok) — miktarı kullanıcı giriyor.
//   3. DEPO > OKUT: kod atanmamışken seçim sebebini söylüyor ("barkod kodu atanmamış"), sonuç yok.
//   4. Kodlar atandıktan sonra aynı fotoğraf ürünü normal sorgulama yolundan getiriyor
//      (`data-depo-okut-sonuc="fm1"`).
const { chromium } = require("playwright");
const { uygulamaAc, modulAc, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Ürün görselleri ve "fotoğraf" ayrı, boş bir sayfada kanvasla çiziliyor — Node'da kanvas yok.
// Rastgelelik yok: aynı çizim her koşuda aynı pikselleri veriyor.
async function gorselleriCiz() {
  const tarayici = await chromium.launch();
  const s = await tarayici.newPage();
  const sonuc = await s.evaluate(async () => {
    const tuval = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    // A: koyu, dikey (bot silüeti) — beyaz fonda.
    const a = tuval(200, 300);
    let x = a.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 200, 300);
    x.fillStyle = "#1f1a17"; x.fillRect(60, 30, 80, 200); x.fillRect(60, 200, 120, 60);
    x.fillStyle = "#4a3b30"; x.fillRect(60, 250, 120, 12);
    // B: açık, yatay (ayakkabı silüeti) — beyaz fonda.
    const b = tuval(300, 200);
    x = b.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 300, 200);
    x.fillStyle = "#d9a15b"; x.beginPath(); x.ellipse(150, 110, 120, 50, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#f3dcb4"; x.fillRect(40, 130, 220, 18);
    // Fotoğraf: A küçültülüp tezgâh (ahşap renkli) zemine, bulanık ve parlak.
    const img = new Image();
    img.src = a.toDataURL("image/png");
    await img.decode();
    const f = tuval(360, 420);
    x = f.getContext("2d");
    x.fillStyle = "#8b6a47"; x.fillRect(0, 0, 360, 420);
    x.filter = "blur(1.5px) brightness(1.15)";
    x.drawImage(img, 70, 60, 220, 330);
    return { a: a.toDataURL("image/jpeg", 0.9), b: b.toDataURL("image/jpeg", 0.9), foto: f.toDataURL("image/png") };
  });
  await tarayici.close();
  return { ...sonuc, foto: Buffer.from(sonuc.foto.split(",")[1], "base64") };
}

async function fotoYukle(sayfa, foto) {
  await sayfa.locator("[data-foto-ac]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-foto-panel] [data-foto-dosya="galeri"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: foto });
  for (let i = 0; i < 40; i++) {
    await sayfa.waitForTimeout(200);
    if (await sayfa.locator("[data-foto-aday]").count()) break;
  }
  return sayfa.evaluate(() => [...document.querySelectorAll("[data-foto-aday]")].map((b) => {
    const skor = b.lastElementChild.textContent.trim();
    // Yüzde gösterilmiyor (kanvas yuvarlaması sürüme göre oynayabilir); sıra ve "görseli yok" ölçülüyor.
    return b.getAttribute("data-foto-aday") + (skor === "görseli yok" ? " (görseli yok)" : "");
  }));
}

async function calistir() {
  const g = await gorselleriCiz();
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push(
    { id: "fm1", ad: "Foto Model A", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", kapakResmi: g.a,
      variants: ["40", "41"].map((b) => ({ renk: "Siyah", beden: b, miktar: 3 })), hareketler: [], recete: [], birimFiyat: 500 },
    { id: "fm2", ad: "Foto Model B", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", kapakResmi: g.b,
      variants: ["40", "41"].map((b) => ({ renk: "Taba", beden: b, miktar: 2 })), hareketler: [], recete: [], birimFiyat: 450 },
  );
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- 1-2. SİPARİŞ ----
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);
  await cariSec(sayfa, "Müşteri B");   // v1.620.0: aramalı cari kutusu
  await sayfa.waitForTimeout(400);
  const dugmeKapaliPanelde = await sayfa.locator("[data-foto-ac]:visible").count();
  await sayfa.locator("[data-barkod-paneli-ac]:visible").first().click();
  await sayfa.waitForTimeout(300);
  const adaylar = await fotoYukle(sayfa, g.foto);
  await sayfa.locator("[data-foto-aday]").first().click();
  await sayfa.waitForTimeout(600);
  const siparis = {
    dugmeKapaliPanelde,
    adaylar,
    ilkSirada: (adaylar[0] || "").split(" (")[0],
    bildirim: await sayfa.evaluate(() => (document.body.innerText.match(/Foto Model A · Siyah seçildi[^\n]*/) || [null])[0]),
    panelKapandi: (await sayfa.locator("[data-foto-panel]").count()) === 0,
    urunAlani: await sayfa.locator('input[placeholder="Model ara…"]').first().inputValue(),
    renkAlani: await sayfa.locator("[data-siparis-renk-arama]").first().inputValue(),
    miktarKutulari: await sayfa.evaluate(() => [...document.querySelectorAll("[data-olcu-miktar]")].filter((x) => x.offsetParent).map((x) => x.getAttribute("data-olcu-miktar"))),
    // Kalem kendiliğinden eklenmemeli.
    formKalemSatiri: await sayfa.locator("[data-form-kalem-satiri]").count(),
  };

  // ---- 3. DEPO > OKUT, kod atanmamışken ----
  const depoOkut = async () => {
    await modulAc(sayfa, "Depo");
    await sayfa.waitForTimeout(600);
    await sayfa.locator('button:has-text("Okut"):visible').first().click();
    await sayfa.waitForTimeout(500);
  };
  const depoSonucu = () => sayfa.evaluate(() => {
    const s = document.querySelector("[data-depo-okut-sonuc]");
    return s ? s.getAttribute("data-depo-okut-sonuc") : null;
  });
  await depoOkut();
  const depoAdaylar = await fotoYukle(sayfa, g.foto);
  await sayfa.locator("[data-foto-aday]").first().click();
  await sayfa.waitForTimeout(500);
  const kodsuz = {
    ilkSirada: (depoAdaylar[0] || "").split(" (")[0],
    // Depoda havuz tüm ürünler (hammadde dahil) — Deri de aday.
    deriAday: depoAdaylar.some((a) => a.startsWith("Deri|")),
    uyari: await sayfa.evaluate(() => (document.body.innerText.match(/Foto Model A · Siyah bulundu ama barkod kodu atanmamış[^\n]*/) || [null])[0]),
    sonuc: await depoSonucu(),
  };

  // ---- 4. Kodları ata, aynı fotoğraf ----
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);
  await depoOkut();
  await fotoYukle(sayfa, g.foto);
  await sayfa.locator("[data-foto-aday]").first().click();
  await sayfa.waitForTimeout(600);
  const kodlu = {
    sonuc: await depoSonucu(),
    urun: await sayfa.evaluate(() => { const u = document.querySelector("[data-depo-okut-urun]"); return u ? u.textContent : null; }),
  };

  await tarayici.close();
  return { hatalar, siparis, depo: { kodsuz, kodlu } };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
