// SENARYO — FİRMA LOGOSU KÜÇÜLTÜLEREK SAKLANIR (10 Ekim, v1.635.0).
// Supabase kullanımı incelenirken bulundu: kullanıcının logosu tanımlar kaydında 500 KB'tı (her açılışta indiriliyor,
// sunucu arşivi her eski hâlin tam kopyasını tutuyor). Kurulum: tanımlarda 1600×1000, gürültülü (sıkışmayan) büyük
// PNG logo. Ölçülen:
//   1) açılıştan sonra logo BİR KEZ küçültülüp kaydediliyor: depodaki logo eskisinin %20'sinden küçük, uzun kenarı
//      400 px, hâlâ geçerli bir resim (ekranda çiziliyor);
//   2) Tanımlar > Firma Bilgileri'nden büyük dosya yüklenince de küçültülmüş hâli kaydediliyor;
const { uygulamaAc, depoOku, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { chromium } = require("playwright");
const fs = require("fs"); const os = require("os"); const path = require("path");

async function buyukLogo() {
  const t = await chromium.launch(); const s = await t.newPage();
  const url = await s.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 1600; c.height = 1000;
    const g = c.getContext("2d"); const d = g.createImageData(1600, 1000);
    let x = 12345; for (let i = 0; i < d.data.length; i += 4) { x = (x * 1103515245 + 12345) & 0x7fffffff; d.data[i] = x & 255; d.data[i + 1] = (x >> 8) & 255; d.data[i + 2] = (x >> 16) & 255; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return c.toDataURL("image/png");
  });
  await t.close(); return url;
}
const resimBoyu = (sayfa, src) => sayfa.evaluate((src) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.onerror = () => r(null); i.src = src; }), src);

async function calistir() {
  const logo = await buyukLogo();
  const sonuc = { tohumLogoKB: logo.length > 1000000 };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), unvan: "Atölye", logo };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM, "tanimlar:data": JSON.stringify(tan) }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3500);
  const yeni = ((await depoOku(sayfa, "tanimlar:data")).firmaBilgileri || {}).logo || "";
  sonuc.acilista = { kuculdu: yeni.length < logo.length * 0.2, boyut: await resimBoyu(sayfa, yeni), unvanKorundu: ((await depoOku(sayfa, "tanimlar:data")).firmaBilgileri || {}).unvan };

  // 2) Tanımlar'dan büyük dosya yükleme.
  const dosya = path.join(os.tmpdir(), "logo-buyuk.png");
  fs.writeFileSync(dosya, Buffer.from(logo.split(",")[1], "base64"));
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await sayfa.waitForTimeout(700);
  // "Logo Değiştir" etiketinin içindeki dosya girdisi.
  const adaylar = await sayfa.evaluate(() => [...document.querySelectorAll('input[type="file"]')].map((x, i) => ({ i, yakin: (x.closest("label") || {}).textContent || "" })).filter((x) => /Logo Değiştir/.test(x.yakin)).map((x) => x.i));
  if (adaylar.length) {
    await sayfa.locator('input[type="file"]').nth(adaylar[0]).setInputFiles(dosya);
    await sayfa.waitForTimeout(1500);
    const y2 = ((await depoOku(sayfa, "tanimlar:data")).firmaBilgileri || {}).logo || "";
    sonuc.yuklemede = { kuculdu: y2.length < logo.length * 0.2, boyut: await resimBoyu(sayfa, y2) };
  } else sonuc.yuklemede = "logo girdisi bulunamadı";
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
