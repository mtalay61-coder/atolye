// SENARYO — BANKA EXCEL'İ (v1.671.0). Ekstre CSV'si yüklenir: açıklamadaki ünvandan cari önerilir, artı tutar
// Tahsilat olarak cariye + bankaya, carisiz eksi tutar yalnız bankaya işlenir; aynı dosya ikinci kez yüklenince
// satırlar "daha önce aktarıldı" gelir.
const fs = require("fs"); const os = require("os"); const path = require("path");
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const EKSTRE = path.join(os.tmpdir(), "banka-ekstre-senaryo.csv");
fs.writeFileSync(EKSTRE, 'Hesap: Test Bankasi\n\nTarih,Açıklama,Tutar,Bakiye\n15.10.2026,EFT MÜŞTERİ B SİPARİŞ ÖDEMESİ,"1.500,00","1.500,00"\n16.10.2026,HAVALE MASRAFI,"-12,50","1.487,50"\n');
(async () => {
  const m = JSON.parse(TOHUM["muhasebe:data"]); m.bankalar = [{ id: "b1", ad: "Test Bankası", paraBirimi: "TRY", hareketler: [] }];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM, "muhasebe:data": JSON.stringify(m) }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  const git = async () => { await sayfa.locator('[data-odeme-alani-sekme="bankaexcel"]:visible').first().click(); await sayfa.waitForTimeout(600); };
  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);
  await git();
  const ekran = sayfa.locator('[data-banka-excel]:visible');
  await ekran.locator('[data-banka-excel-dosya]').setInputFiles(EKSTRE); await sayfa.waitForTimeout(800);
  console.log("ONIZLEME", (await ekran.locator("tbody").innerText()).split("\n").join(" | "));
  await ekran.locator('[data-banka-excel-kaydet]').click(); await sayfa.waitForTimeout(1500);
  await ekran.locator('[data-banka-excel-dosya]').setInputFiles(EKSTRE); await sayfa.waitForTimeout(800);
  console.log("TEKRAR", (await ekran.locator("tbody").innerText()).split("\n").join(" | "));
  const mh = await depoOku(sayfa, "muhasebe:data"); const cr = await depoOku(sayfa, "cari:data");
  console.log("BANKA", JSON.stringify((mh.bankalar[0].hareketler||[]).map(h=>[h.yon,h.tutar,h.aciklama,!!h.bankaRef])));
  console.log("CARI", JSON.stringify(cr.find(c=>c.unvan==="Müşteri B").hareketler.map(h=>[String(h.fisNo).slice(0,4),h.yon,h.tutar,h.aciklama])));
  console.log("hatalar", hatalar); await tarayici.close();
})();
