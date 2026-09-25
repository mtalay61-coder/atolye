// SENARYO — STOK MİKTARI HAREKETLERDEN TÜRETİLİR (kullanıcı, 16 Eylül: "tek defterden tutalım,
// her şey tek deftere yazılsın, girende çıkanda; fişi olmayan kayıt aklım almıyor"). Parça 1.
//
// Ölçülen:
//  1) GEÇİŞ: hareketi olmayan başlangıç miktarı açılış fişine bağlanıyor (ACL-…), miktar korunuyor.
//  2) TÜRETME: varyant miktarı bozuk yazılmış olsa bile açılışta hareketlerden düzeltiliyor —
//     "kayıtlı stok ile hareket geçmişi tutmuyor" uyarısının sebebi ortadan kalkıyor.
//  3) HAREKETSİZ VARYANT SIFIR: açılış göçü bir kez çalıştıktan sonra hareketi olmayan varyant 0.
//  4) EKSİ STOK: girişi olmayan ürün satılınca stok eksiye düşüyor (kullanıcının beklediği).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Göç damgası TANIMLARDA (hesap başına bir kez). Göçün karışmadığı senaryolar için damgalı tohum.
// Göçün karışmasını istemeyen adımlar için damgalı tohum.
function tohumGocluMu() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.acilisGocuYapildi = true;
  t["tanimlar:data"] = JSON.stringify(tan);
  return t;
}

// Ürün kartını açıp "Toplam: N Çift" değerini okur.
async function urunToplamiOku(sayfa) {
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  return sayfa.evaluate(() => (document.body.innerText.match(/Toplam:\s*(-?\d+(?:[.,]\d+)?)\s*[ÇçA-Za-z]/) || [])[1] || null);
}

async function calistir() {
  const hatalar = [];

  // ---- 1) GEÇİŞ: hareketsiz 104 çift.
  const t1 = { ...TOHUM };
  const st1 = JSON.parse(TOHUM["stok:items"]);
  const bot1 = st1.find((p) => p.id === "u2");
  bot1.variants = [{ renk: "Siyah", beden: "41", miktar: 104 }];
  bot1.hareketler = [];
  t1["stok:items"] = JSON.stringify(st1);
  const birinci = await uygulamaAc(t1, { hataYaz: false });
  birinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await birinci.sayfa.waitForTimeout(2600);
  const p1 = (await depoOku(birinci.sayfa, "stok:items")).find((x) => x.id === "u2");
  const gecis = {
    varyant: (p1.variants || []).map((v) => `${v.beden}:${v.miktar}`),
    hareket: (p1.hareketler || []).map((h) => `${h.kaynak}:${h.miktar}:${(h.fisNo || "").slice(0, 3)}`),
  };
  await birinci.tarayici.close();

  // ---- 2) TÜRETME: varyant bozuk (0) ama hareketler +8 diyor; açılışta düzelmeli.
  //      (Göç damgası basılı geliyor ki göç devreye girmesin — ayrışma senaryosu bu.)
  const t2 = tohumGocluMu();
  const st2 = JSON.parse(TOHUM["stok:items"]);
  const bot2 = st2.find((p) => p.id === "u2");
  bot2.variants = [{ renk: "Siyah", beden: "41", miktar: 0 }];
  bot2.hareketler = [{ id: "h1", tarih: "2026-09-14", kaynak: "Satınalma", renk: "Siyah", beden: "41", miktar: 8, fisNo: "ALS-9-F1" }];
  t2["stok:items"] = JSON.stringify(st2);
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2500);
  // Türetme state üzerinde olur (depoya yazma tetiklenmez), o yüzden EKRANDAN okunuyor:
  // ürün kartındaki "Toplam: N" satırı.
  const turetme = { ekranToplami: await urunToplamiOku(ikinci.sayfa) };
  await ikinci.tarayici.close();

  // ---- 3+4) Hareketsiz varyant sıfır + eksi stok: göç damgalı, hareketi yalnız ÇIKIŞ olan ürün.
  const t3 = tohumGocluMu();
  const st3 = JSON.parse(TOHUM["stok:items"]);
  const bot3 = st3.find((p) => p.id === "u2");
  bot3.variants = [{ renk: "Siyah", beden: "41", miktar: 50 }, { renk: "Siyah", beden: "42", miktar: 7 }];
  bot3.hareketler = [{ id: "h2", tarih: "2026-09-15", kaynak: "Satış", renk: "Siyah", beden: "41", miktar: -104, fisNo: "SAT-9-F1" }];
  t3["stok:items"] = JSON.stringify(st3);
  const ucuncu = await uygulamaAc(t3, { hataYaz: false });
  ucuncu.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ucuncu.sayfa.waitForTimeout(2500);
  const eksiVeSifir = { ekranToplami: await urunToplamiOku(ucuncu.sayfa) };
  await ucuncu.tarayici.close();

  return { hatalar, gecis, turetme, eksiVeSifir };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
