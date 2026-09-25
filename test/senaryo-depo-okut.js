// SENARYO — DEPO OKUT / SORGULA (22 Eylül, v1.411.0)
//
// Kullanıcı: "Depoda barkod okutma nasıl olacak?" → önce SORGULA, cihaz TELEFON KAMERASI.
//
// A) ELLE (USB okuyucu da klavye gibi yazar): kodlar uygulamanın kendi düğmesiyle atanır; Depo >
//    Okut'ta beden / renk / hammadde / koli / tanımsız kod okutulur. Ölçülen: doğru ürün, okutulan
//    beden vurgulu, stok ve talep sayıları, bekleyen sipariş, tanımsız kodda doğru açıklama; hiçbir
//    kayıt değişmedi (salt okuma).
// B) KAMERA: A'da atanan beden barkodu KENDİ kodlayıcımızla çizilir, sahte kamera videosuna (y4m)
//    çevrilir; Chromium o "kamerayla" açılır, "Kamerayla okut"a basılır. Ölçülen: ürün kendiliğinden
//    ekrana geliyor mu. Linux Chromium'da BarcodeDetector yok → YERLEŞİK çözücümüz uçtan uca sınanır.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function okutVeOku(sayfa, kod) {
  const g = sayfa.locator("[data-depo-okut-girdi]:visible").first();
  await g.fill(kod);
  await g.press("Enter");
  await sayfa.waitForTimeout(400);
  return sayfa.evaluate(() => {
    const s = document.querySelector("[data-depo-okut-sonuc]");
    const t = document.querySelector("[data-depo-okut-tanimsiz]");
    if (!s) return { tanimsiz: t ? t.textContent.replace(/\s+/g, " ").trim() : null };
    const satirlar = [...s.querySelectorAll("[data-depo-okut-satir]")].map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).join("|") + (tr.querySelector("td").style.fontWeight === "700" ? " ◀" : ""));
    return {
      urun: s.querySelector("[data-depo-okut-urun]").textContent,
      basliklar: [...s.querySelectorAll("thead th")].map((th) => th.textContent).slice(0, 7),
      satirlar,
      siparisler: [...s.querySelectorAll("[data-depo-okut-siparis]")].map((d) => d.textContent.replace(/\s+/g, " ").trim()),
    };
  });
}

// y4m (YUV4MPEG2, 4:2:0) — gri görüntüyü Chromium'un sahte kamerasına verilecek videoya çevirir.
function y4mYaz(dosya, gri, w, h, kare = 30) {
  const baslik = Buffer.from(`YUV4MPEG2 W${w} H${h} F15:1 Ip A1:1 C420jpeg\n`);
  const uv = Buffer.alloc((w / 2) * (h / 2) * 2, 128);
  const parcalar = [baslik];
  for (let i = 0; i < kare; i++) parcalar.push(Buffer.from("FRAME\n"), Buffer.from(gri), uv);
  fs.writeFileSync(dosya, Buffer.concat(parcalar));
}

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: b === "38" ? 10 : 4 })),
    hareketler: [], recete: [], birimFiyat: 465 });
  t["stok:items"] = JSON.stringify(stok);
  const sp = JSON.parse(t["siparis:data"] || "[]");
  sp.push({ id: "sp-okut", siparisNo: "SAT-OKUT", tip: "Satış", durum: "Onaylandı", cariId: "c2", tarih: "2026-09-20",
    kalemler: [{ id: "k1", urunId: "m125", urunAd: "125 Model", renk: "Siyah", beden: "38", miktar: 3, karsilanan: 0, birimFiyat: 465 }] });
  t["siparis:data"] = JSON.stringify(sp);

  // ---- A) ELLE ----
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
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
  const deri = st.find((u) => u.id === "u1");
  const siyah = (tn.renkler || []).find((r) => r.ad === "Siyah").barkodKodu;
  const b38 = (tn.bedenler || []).find((b) => b.ad === "38").barkodKodu;
  const kodRenk = `90${hane(m125.stokNo, 4)}${hane(siyah, 4)}`;
  const kodBeden = `${kodRenk}${hane(b38, 2)}`;
  const kodDeri = `90${hane(deri.stokNo, 4)}${hane(siyah, 4)}`;

  const oncekiDepo = JSON.stringify(await sayfa.evaluate(() => window.__depo));
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Okut"):visible').first().click();
  await sayfa.waitForTimeout(500);
  const elle = {
    beden: await okutVeOku(sayfa, kodBeden),
    renk: await okutVeOku(sayfa, kodRenk),
    hammadde: await okutVeOku(sayfa, kodDeri),
    koli: await okutVeOku(sayfa, "K-20260922-001"),
    yok: await okutVeOku(sayfa, "909999"),
  };
  const sonrakiDepo = JSON.stringify(await sayfa.evaluate(() => window.__depo));
  // Kamera testinde aynı veriyle açmak için: kodlar atanmış depo + etiket görüntüsü (kendi kodlayıcımız).
  const etiket = await sayfa.evaluate((kod) => {
    const svg = window.__erp && window.__erp.barkodSvg ? window.__erp.barkodSvg(kod, { birim: 3, yukseklik: 120, yaziGoster: false }) : null;
    return svg;
  }, kodBeden);
  const depoAnlik = await sayfa.evaluate(() => ({ ...window.__depo }));
  await tarayici.close();

  // ---- B) KAMERA ----
  let kamera = { atlandi: "etiket çizilemedi" };
  if (etiket) {
    const W = 640, H = 480;
    // SVG'yi ayrı, kamerasız bir sayfada gri piksellere çevir.
    const { tarayici: t2, sayfa: s2 } = await uygulamaAc({}, { hataYaz: false });
    const gri = await s2.evaluate(async ({ svg, W, H }) => {
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(svg);
      await img.decode();
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
      x.filter = "blur(0.6px)";   // hafif odak kaybı
      x.drawImage(img, Math.round((W - img.width) / 2), Math.round((H - img.height) / 2));
      const d = x.getImageData(0, 0, W, H).data;
      const g = new Array(W * H);
      for (let i = 0; i < W * H; i++) g[i] = Math.round(0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]);
      return g;
    }, { svg: etiket, W, H });
    await t2.close();
    const video = path.join(os.tmpdir(), `depo-okut-${process.pid}.y4m`);
    y4mYaz(video, Uint8Array.from(gri), W, H);
    const { tarayici: t3, sayfa: s3 } = await uygulamaAc(depoAnlik, {
      hataYaz: false,
      tarayiciArgs: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${video}`],
    });
    const h3 = [];
    s3.on("pageerror", (e) => h3.push(e.message.split("\n")[0]));
    await s3.context().grantPermissions(["camera"]).catch(() => {});
    await s3.waitForTimeout(2200);
    await modulAc(s3, "Depo");
    await s3.waitForTimeout(600);
    await s3.locator('button:has-text("Okut"):visible').first().click();
    await s3.waitForTimeout(400);
    await s3.locator("[data-kamera-ac]:visible").first().click();
    let okundu = null;
    for (let i = 0; i < 40 && !okundu; i++) {
      await s3.waitForTimeout(250);
      okundu = await s3.evaluate(() => {
        const s = document.querySelector("[data-depo-okut-sonuc]");
        return s ? s.getAttribute("data-depo-okut-sonuc") : null;
      });
    }
    const durum = await s3.evaluate(() => {
      const h = document.querySelector("[data-kamera-hata]");
      const y = document.querySelector("[data-kamera-okuyucu]");
      return { hata: h ? h.textContent : null, bilgi: y ? (y.textContent.match(/yerleşik okuyucu|cihaz okuyucusu/) || [null])[0] : null };
    });
    await t3.close();
    fs.unlinkSync(video);
    kamera = { okunanUrun: okundu, yontem: durum.bilgi, hata: durum.hata, sayfaHatalari: h3 };
  }

  return {
    hatalar,
    kodUzunluklari: [kodRenk.length, kodBeden.length],
    elle,
    saltOkuma: oncekiDepo === sonrakiDepo,
    kamera,
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
