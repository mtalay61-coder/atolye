// SENARYO — CARİ MUTABAKAT (v1.673.0). Geçen ay sonu bakiyesi olan cari listelenir (bu ayın hareketi bakiyeye
// girmez); SMTP yoksa toplu gönderim kapalı ve uyarı görünür; mektup gövdesi resmi ünvanı ve dönem sonunu taşır.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
(async () => {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  const d = new Date(); const gecenAy = new Date(d.getFullYear(), d.getMonth() - 1, 10); const buAy = new Date(d.getFullYear(), d.getMonth(), 1);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const c2 = cariler.find((c) => c.id === "c2");
  c2.resmiUnvan = "Müşteri B Ticaret A.Ş."; c2.eposta = "b@ornek.com";
  c2.hareketler = [
    { id: "h1", fisNo: "SF-1", tarih: iso(gecenAy), yon: "Borç", tutar: 1000, paraBirimi: "TRY", defter: "Resmi", aciklama: "satış" },
    { id: "h2", fisNo: "THS-1", tarih: iso(buAy), yon: "Alacak", tutar: 400, paraBirimi: "TRY", defter: "Resmi", aciklama: "tahsilat" },
  ];
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Cari Mutabakat"):visible').first().click(); await sayfa.waitForTimeout(800);
  const ekran = sayfa.locator("[data-mutabakat]:visible");
  const satirlar = await ekran.locator("[data-mutabakat-satir]").evaluateAll((r) => r.map((x) => [x.cells[1].innerText.replace(/\n/g, " / "), x.cells[2].innerText, x.cells[3].innerText, x.cells[4].innerText]));
  const smtpUyari = await ekran.locator("[data-mutabakat-smtp-yok]").count();
  const topluKapali = await ekran.locator("[data-mutabakat-toplu]").isDisabled();
  // Yazdır: belge gizli çerçevede açılır — gövdesi oradan okunur (yazıcı penceresi testte açılmaz).
  await sayfa.evaluate(() => { window.print = () => {}; });
  await sayfa.exposeFunction("__yakala", () => {});
  await ekran.locator("[data-mutabakat-satir] button:has-text('Yazdır')").first().click(); await sayfa.waitForTimeout(500);
  const h = await sayfa.evaluate(() => { const f = [...document.querySelectorAll("iframe")].pop(); return f && f.contentDocument ? f.contentDocument.body.innerText : ""; });
  const mektup = [/Sayın Müşteri B Ticaret A\.Ş\./.test(h), /1\.000,00/.test(h), /BORÇ/.test(h), /Mutabıkız/.test(h)];
  console.log(JSON.stringify({ satirlar, smtpUyari, topluKapali, mektup, hatalar }, null, 1));
  await tarayici.close();
})();
