// SENARYO — RENK KODLARI TEK HAVUZDAN (kullanıcı, 13 Eylül: "hammadde ve mamul rengi kodları çakışıyor").
// Boş veritabanında mamul "Siyah" (101) sonra hammadde "Siyah" da 101 alıyordu. Ölçülen: ikinci renk
// 102; var olan çakışma için uyarı ve "Düzelt".
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  // Eski üretimden kalmış çakışma: iki AYRI renk aynı 101 kodunda. (Aynı adlı Mamul+Hammadde çifti
  // artık açılışta tek kayda iniyor — tek renk havuzu, 9g; o yüzden farklı adlar.)
  tanimlar.renkler = [
    { id: "r1", ad: "Siyah", tip: "Hammadde", kod: "101", renkKodu: "#000" },
    { id: "r2", ad: "Taba", tip: "Hammadde", kod: "101", renkKodu: "#963" },
  ];
  tanimlar.renkKombinasyonlari = [{ id: "k1", kod: "1001", renkIdler: ["r2"] }];
  t["tanimlar:data"] = JSON.stringify(tanimlar);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const uyariVar = await sayfa.evaluate(() => (document.querySelector("[data-renk-kod-cakisma]") || {}).getAttribute("data-renk-kod-cakisma"));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-renk-kod-duzelt]"); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const duzeltilmis = ((await depoOku(sayfa, "tanimlar:data")).renkler || []).map((r) => `${r.tip}:${r.kod}`);
  const uyariKalkti = await sayfa.evaluate(() => !document.querySelector("[data-renk-kod-cakisma]"));

  // Yeni hammadde rengi: kombinasyon kodu (1001) ve var olan kodlar atlanarak sıradaki.
  await sayfa.locator('input[placeholder="Örn. Ham Bej"]').first().fill("Bej");
  await sayfa.keyboard.press("Enter");
  await sayfa.waitForTimeout(800);
  const sonKodlar = ((await depoOku(sayfa, "tanimlar:data")).renkler || []).map((r) => `${r.ad}/${r.tip}:${r.kod}`);

  await tarayici.close();
  return { hatalar, uyariVar, duzeltilmis, uyariKalkti, sonKodlar };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
