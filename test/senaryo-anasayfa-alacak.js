// SENARYO — TOPLAM ALACAK PARA BİRİMİ BAZINDA (kullanıcı, 18 Eylül: "anasayfada toplam alacak
// sadece TL cinsinden toplanıyor, 3 para birimi var, ayrı ayrı toplanması gerek").
//
// Kart yalnız TL bakiyesini gösteriyordu; dolar ve euro alacakları hiç görünmüyordu. Kur ile tek
// sayıya çevirmek de yanlış olurdu: kur her gün değişir, alacak dövizdir.
//
// Ölçülen: (1) üç para birimi de kartta; (2) TL başta (ana para birimi); (3) tek para birimi varsa
// alt satır eski bilgiyi (cari sayısı) göstermeye devam ediyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohum(cokPB) {
  const t = { ...TOHUM };
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((x) => {
    if (x.id === "c1") return { ...x, hareketler: [{ id: "a1", tarih: "2026-09-10", yon: "Borç", tutar: 120000, paraBirimi: "TRY", defter: "Genel" }] };
    if (x.id === "c2" && cokPB) {
      return { ...x, hareketler: [
        { id: "a2", tarih: "2026-09-10", yon: "Borç", tutar: 3000, paraBirimi: "USD", defter: "Genel" },
        { id: "a3", tarih: "2026-09-11", yon: "Borç", tutar: 4500, paraBirimi: "EUR", defter: "Genel" },
      ] };
    }
    return { ...x, hareketler: [] };
  }));
  return t;
}

async function kart(sayfa) {
  const m = await sayfa.evaluate(() => document.body.innerText.replace(/\n/g, " | "));
  const i = m.indexOf("TOPLAM ALACAK");
  const kesit = i < 0 ? "" : m.slice(i, i + 120);
  const parcalar = kesit.split("|").map((x) => x.trim());
  return { anaSatir: parcalar[1] || null, altSatir: parcalar[2] || null };
}

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(tohum(true), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const cokPB = await kart(sayfa);
  await tarayici.close();

  const ikinci = await uygulamaAc(tohum(false), { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2500);
  const tekPB = await kart(ikinci.sayfa);
  await ikinci.tarayici.close();

  return { hatalar, cokPB, tekPB };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
