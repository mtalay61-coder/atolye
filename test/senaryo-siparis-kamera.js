// SENARYO — SİPARİŞTE KAMERAYLA BARKOD OKUMA (24 Eylül, v1.438.0).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "Siparişte kamera ile barkod okuma ekranı ekleyelim, daha önce yaptık."
// Sipariş formunun barkod paneline Depo > Okut'takiyle AYNI `KameraOkuyucu` (236) kondu; okunan kod
// elle yazılanla AYNI kapıdan (`asortiBarkodOkut`) geçiyor.
//
// Ölçülenler:
//   1. Barkod paneli kapalıyken kamera düğmesi yok; panel açılınca "Kamerayla okut" düğmesi barkod
//      kutusunun yanında (aynı panelde) var.
//   2. Kamera açılınca görüntü KENDİ SATIRINA iniyor (`flexBasis: 100%`) — barkod kutusunun altında,
//      kutunun genişliği ezilmiyor.
//   3. Uygulamanın KENDİ çizicisiyle (`window.__erp.barkodSvg`) çizilmiş beden barkodu y4m'e
//      çevrilip Chromium'un sahte kamerasına veriliyor. Linux Chromium'da BarcodeDetector yok →
//      "yerleşik okuyucu" (Code128 çözücümüz) kodu çözüyor, sipariş kalemi kendiliğinden ekleniyor.
//   4. Kamera açık kaldıkça AYNI kod tekrar tekrar eklenmiyor (2 sn tekrar süzgeci) — tek kalem, 1 çift.
//   5. Sipariş kaydedilince kalem kayıtta: 125 Model · Siyah · 38 × 1.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { uygulamaAc, depoOku, modulAc, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// y4m (YUV4MPEG2, 4:2:0) — gri görüntüyü Chromium'un sahte kamerasına verilecek videoya çevirir.
// (senaryo-depo-okut'taki yardımcının aynısı; o dosya dışa aktarmıyor, dokunulmadan kopyalandı.)
function y4mYaz(dosya, gri, w, h, kare = 30) {
  const baslik = Buffer.from(`YUV4MPEG2 W${w} H${h} F15:1 Ip A1:1 C420jpeg\n`);
  const uv = Buffer.alloc((w / 2) * (h / 2) * 2, 128);
  const parcalar = [baslik];
  for (let i = 0; i < kare; i++) parcalar.push(Buffer.from("FRAME\n"), Buffer.from(gri), uv);
  fs.writeFileSync(dosya, Buffer.concat(parcalar));
}

function tohumHazirla() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: 10 })),
    hareketler: [], recete: [], birimFiyat: 465 });
  t["stok:items"] = JSON.stringify(stok);
  return t;
}

async function calistir() {
  const hatalar = [];

  // ---- A) KODLARI ATA, ETİKETİ ÇİZ (kamerasız) ----
  const { tarayici, sayfa } = await uygulamaAc(tohumHazirla(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);
  const st = await depoOku(sayfa, "stok:items");
  const tn = await depoOku(sayfa, "tanimlar:data");
  const hane = (n, h) => String(n).padStart(h, "0");
  const m125 = st.find((u) => u.id === "m125");
  const siyah = tn.renkler.find((r) => r.ad === "Siyah").barkodKodu;
  const b38 = tn.bedenler.find((b) => b.ad === "38").barkodKodu;
  const kodBeden = `90${hane(m125.stokNo, 4)}${hane(siyah, 4)}${hane(b38, 2)}`;
  const etiket = await sayfa.evaluate((kod) => (window.__erp && window.__erp.barkodSvg
    ? window.__erp.barkodSvg(kod, { birim: 3, yukseklik: 120, yaziGoster: false }) : null), kodBeden);
  // SVG → gri pikseller (aynı, kamerasız sayfada).
  const W = 640, H = 480;
  const gri = etiket ? await sayfa.evaluate(async ({ svg, W, H }) => {
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(svg);
    await img.decode();
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    x.filter = "blur(0.6px)";   // hafif odak kaybı: gerçek kameraya yakın
    x.drawImage(img, Math.round((W - img.width) / 2), Math.round((H - img.height) / 2));
    const d = x.getImageData(0, 0, W, H).data;
    const g = new Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = Math.round(0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]);
    return g;
  }, { svg: etiket, W, H }) : null;
  const depoAnlik = await sayfa.evaluate(() => ({ ...window.__depo }));
  await tarayici.close();
  if (!gri) return { hatalar, atlandi: "etiket çizilemedi (window.__erp.barkodSvg yok)" };

  const video = path.join(os.tmpdir(), `siparis-kamera-${process.pid}.y4m`);
  y4mYaz(video, Uint8Array.from(gri), W, H);

  // ---- B) SAHTE KAMERAYLA SİPARİŞ ----
  const { tarayici: t2, sayfa: s2 } = await uygulamaAc(depoAnlik, {
    hataYaz: false,
    tarayiciArgs: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${video}`],
  });
  s2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await s2.context().grantPermissions(["camera"]).catch(() => {});
  await s2.waitForTimeout(2200);
  await modulAc(s2, "Sipariş");
  await s2.waitForTimeout(700);
  // Sipariş ekranı liste görünümünde açılıyor; barkod kutusu YENİ SİPARİŞ formunda.
  await s2.locator("[data-yeni-siparis]:visible").first().click();
  await s2.waitForTimeout(700);
  await cariSec(s2, "Müşteri B");   // v1.620.0: aramalı cari kutusu
  await s2.waitForTimeout(400);

  // 1. Düğme panelin içinde.
  const kameraDugmesi = async () => s2.locator("[data-kamera-ac]:visible").count();
  const panel = { kapaliyken: await kameraDugmesi() };
  await s2.locator("[data-barkod-paneli-ac]:visible").first().click();
  await s2.waitForTimeout(300);
  panel.acikken = await kameraDugmesi();
  panel.barkodKutusuYaninda = await s2.evaluate(() => {
    const b = document.querySelector("[data-kamera-ac]");
    const k = document.querySelector('input[title="Barkod"]');
    return !!(b && k) && b.closest("[data-kamera-okuyucu]").parentElement.parentElement === k.closest("label").parentElement;
  });
  const kutuGenisligiOnce = await s2.evaluate(() => Math.round(document.querySelector('input[title="Barkod"]').getBoundingClientRect().width));

  // 3. Kamerayı aç, kalem doğana kadar bekle.
  await s2.locator("[data-kamera-ac]:visible").first().click();
  // Formdaki beden hücreleri: her biri "Bu bedeni sil" düğmesinin yanında bir miktar kutusu.
  const formKalemleri = () => s2.evaluate(() => [...document.querySelectorAll('[data-form-kalem-satiri] button[title="Bu bedeni sil"]')]
    .map((b) => b.parentElement.querySelector("input").value));
  let okundu = false;
  let bildirim = null;
  for (let i = 0; i < 60 && !okundu; i++) {
    await s2.waitForTimeout(250);
    const m = await s2.evaluate(() => (document.body.innerText.match(/125 Model · Siyah · 38: 1 eklendi/) || [null])[0]);
    if (m) { okundu = true; bildirim = m; }
  }
  const okununca = await formKalemleri();
  // 2. Yerleşim (kamera açıkken).
  const yerlesim = await s2.evaluate(() => {
    const v = document.querySelector("[data-kamera-okuyucu] video");
    const k = document.querySelector('input[title="Barkod"]');
    const rv = v.getBoundingClientRect(), rk = k.getBoundingClientRect();
    return { goruntuKutununAltinda: rv.top >= rk.bottom, kutuGenisligi: Math.round(rk.width) };
  });
  yerlesim.kutuEzilmedi = yerlesim.kutuGenisligi === kutuGenisligiOnce;
  delete yerlesim.kutuGenisligi;
  const durum = await s2.evaluate(() => {
    const h = document.querySelector("[data-kamera-hata]");
    const y = document.querySelector("[data-kamera-okuyucu]");
    return { hata: h ? h.textContent : null, yontem: y ? (y.textContent.match(/yerleşik okuyucu|cihaz okuyucusu/) || [null])[0] : null };
  });

  // 4. Kamera açık kalıyor: aynı kod süzgeçten geçmemeli.
  await s2.waitForTimeout(3000);
  const tekrarSonrasi = await formKalemleri();
  await s2.locator("[data-kamera-kapat]:visible").first().click();
  await s2.waitForTimeout(300);

  // 5. Kaydet.
  await s2.locator('button:has-text("Siparişi Kaydet"):visible').first().click();
  await s2.waitForTimeout(1800);
  const sip = ((await depoOku(s2, "siparis:data")) || []).find((x) => (x.kalemler || []).some((k) => k.urunId === "m125"));
  const kayit = sip ? (sip.kalemler || []).map((k) => `${k.urunAd} · ${k.renk} · ${k.beden} × ${k.miktar}`) : null;

  await t2.close();
  try { fs.unlinkSync(video); } catch (e) { /* geçici dosya */ }
  return {
    hatalar,
    kodUzunlugu: kodBeden.length,
    panel,
    kamera: { okundu, bildirim, ...durum },
    yerlesim,
    // Beden hücrelerinin miktarları: okununca ve 3 sn daha kamera açıkken — ikisi de tek hücre, 1.
    formMiktarlari: { okununca, tekrarSonrasi },
    kayit,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
