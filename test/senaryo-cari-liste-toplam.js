// SENARYO — CARİ HESAPLAR LİSTESİ: ALACAK / BORÇ AYRI SÜTUN, ALTTA NET (29 Eylül, v1.518.0).
//
// Kullanıcı: "Cari hesaplar listesinde alacak borç ayrı sütun olsun" (Finans raporundaki gibi: alacak +, borç −,
// altta net — "300 bin alacak, 250 bin borç → 50 bin alacak").
// Kurulum: Müşteri B 300.000 ₺ alacağımız (satış), Tedarikçi A'ya 250.000 ₺ borcumuz (alış), Personel C −30 (tohum).
// Ölçülen: her kartta Alacak ve Borç hücreleri; listenin altında Alacak +300.000, Borç −250.030, Net +49.970;
// "Müşteri" sekmesinde dip toplam yalnız o sekmenin carileri.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const t = { ...TOHUM };
  const c = JSON.parse(TOHUM["cari:data"]);
  c.find((x) => x.id === "c2").hareketler = [{ id: "l1", tarih: "2026-09-20", yon: "Borç", tutar: 300000, paraBirimi: "TRY", defter: "Genel", fisNo: "SF-L1", aciklama: "Satış" }];
  c.find((x) => x.id === "c1").hareketler = [{ id: "l2", tarih: "2026-09-21", yon: "Alacak", tutar: 250000, paraBirimi: "TRY", defter: "Genel", fisNo: "AF-L1", aciklama: "Alış" }];
  t["cari:data"] = JSON.stringify(c);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 900, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(700);
  const oku = () => sayfa.evaluate(() => ({
    kartlar: [...document.querySelectorAll("[data-cari-liste-bakiye]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) =>
      `${e.getAttribute("data-cari-liste-bakiye")}: alacak ${e.querySelector('[data-cari-liste-hucre="alacak"]').innerText.split("\n").pop()} · borç ${e.querySelector('[data-cari-liste-hucre="borc"]').innerText.split("\n").pop()}`),
    toplam: [...document.querySelectorAll("[data-cari-liste-toplam-pb]")].map((e) => e.innerText.replace(/\s+/g, " ").trim()),
    ustNet: (document.querySelector("[data-cari-ozet-net]") || {}).innerText || null,
  }));
  const tumu = await oku();
  if (ekranGoruntusu) await sayfa.screenshot({ path: ekranGoruntusu, fullPage: true });
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Müşteri\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const musteri = await oku();
  await tarayici.close();
  return { hatalar, tumu, musteri };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
