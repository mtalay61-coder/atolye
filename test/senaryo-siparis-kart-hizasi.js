// SENARYO — SİPARİŞ KARTINDA SÜTUN HİZASI (9 Ekim, v1.627.0).
// Kullanıcı: "Siparişte kolonlar dengesiz, buna düzen getirmemiz lazım, resim hep aynı yerde olsun."
// Ölçülen: üç ürünlü siparişte (biri 5 ölçülü kısa renk adlı, biri tek ölçülü UZUN renk adlı, biri 2 ölçülü 3 renkli)
// her ürün tablosunda resim hücresinin sol kenarı ve genişliği, renk başlığının genişliği, TUTAR ve DURUM başlıklarının
// sol kenarı aynı; resim hücresi üste hizalı; uzun renk adı sarılır (yatay taşma yok).
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, urunId, urunAd, renk, beden) => ({ id, urunId, urunAd, renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "h1", siparisNo: "SAT-H1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", kalemler: [
    ...["36", "37", "38", "39", "40"].map((b, i) => k(`a${i}`, "u2", "Bot", "Siyah", b)),
    k("b1", "u3", "Çizme", "1014 – Beyaz Süet/Beyaz Baskı/Beyaz Deri", "37"),
    ...["Kahve", "Taba", "Bej"].flatMap((r, i) => ["38", "39"].map((b) => k(`c${i}${b}`, "u9", "Sandalet", r, b))),
  ] }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-H1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const olcum = await sayfa.evaluate(() => {
    const tablolar = [...document.querySelectorAll("[data-siparis-kart-tablo]")].filter((x) => x.getBoundingClientRect().width > 0);
    return tablolar.map((tb) => {
      const resim = tb.querySelector("td[rowspan]"); const r = resim.getBoundingClientRect();
      const ths = [...tb.querySelectorAll("tr:first-child th")];
      const bul = (re) => { const h = ths.find((x) => re.test(x.textContent.trim())); return h ? Math.round(h.getBoundingClientRect().left) : null; };
      const renkB = tb.querySelector("[data-siparis-kart-renk-basligi]").getBoundingClientRect();
      return { resimSol: Math.round(r.left), resimGen: Math.round(r.width), resimUst: getComputedStyle(resim).verticalAlign,
        renkGen: Math.round(renkB.width), tutarSol: bul(/^Tutar$/i), durumSol: bul(/^Durum$/i), tasma: tb.scrollWidth > tb.clientWidth + 1 };
    });
  });
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, fullPage: false });
  await tarayici.close();
  const ayni = (alan) => olcum.length > 1 && olcum.every((o) => o[alan] === olcum[0][alan]);
  return { hatalar, tabloSayisi: olcum.length, resimSolAyni: ayni("resimSol"), resimGenAyni: ayni("resimGen"), renkGenAyni: ayni("renkGen"),
    tutarSolAyni: ayni("tutarSol"), durumSolAyni: ayni("durumSol"), resimUste: olcum.every((o) => o.resimUst === "top"), tasmaYok: olcum.every((o) => !o.tasma) };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
