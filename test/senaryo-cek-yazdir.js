// SENARYO — ÇEK BORDROSU YAZDIR (25 Eylül, v1.460.0).
//
// Kullanıcı: "Çek işlemlerinde yazdır ekranı olsun. Çek girişi, ciro vs. çıktı alalım."
//
// Ölçülenler:
//   1. İşlem görmemiş çekte "Yazdır" giriş bordrosunu açıyor: belge adı, belge no (giriş fişi),
//      tutar yazıyla, teslim eden = çeki veren cari, teslim alan = firmamız.
//   2. Ciro sonrası "Yazdır" ciro bordrosunu açıyor: karşı taraf alıcı cari, belge no ciro fişi,
//      teslim eden firmamız; cariye başka birimde işlendiyse o tutar da basılıyor.
//   3. Pencere CANLI: ciro geri alınınca açık pencere iptal belgesini değil güncel çeki gösteriyor;
//      geçmişte her işlemin kendi yazdır düğmesi var.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  const b = cariler0.find((c) => c.id === "c2");
  b.hareketler = [...(b.hareketler || []), {
    id: "hrk-giris", tarih: "2026-09-20", yon: "Alacak", tutar: 42000, paraBirimi: "TRY", odemeSekli: "Çek",
    fisNo: "THS-20260920-001", islemTipi: "Tahsilat", aciklama: "Müşteri çeki · No 555", defter: "Genel", cekId: "ck1",
  }];
  cariler0.find((c) => c.id === "c1").paraBirimi = "USD";
  t["cari:data"] = JSON.stringify(cariler0);
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], bankalar: [], kurlar: { USD: 42, EUR: 56 },
    cekler: [{ id: "ck1", durum: "Portföyde", tip: "Alınan", cekNo: "555", cariId: "c2", tutar: 42000, paraBirimi: "TRY",
      vadeTarihi: "2026-12-01", banka: "Ziraat", sube: "Merkez", kesideci: "Müşteri B", hareketId: "hrk-giris", fisNo: "THS-20260920-001" }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  const belge = () => sayfa.evaluate(() => {
    const k = document.querySelector("#cek-yazdir-alani");
    if (!k) return null;
    const m = k.innerText;
    const imza = [...k.querySelectorAll("div")].filter((d) => /^(Teslim Eden|Teslim Alan)$/.test(d.textContent.trim()))
      .map((d) => `${d.textContent.trim()}: ${(d.nextElementSibling || {}).textContent || ""}`);
    return {
      ad: k.getAttribute("data-cek-belge"),
      belgeNo: (m.match(/Belge No:\s*(\S+)/) || [])[1] || null,
      yaziyla: ((k.querySelector("[data-cek-yaziyla]") || {}).textContent || "").trim(),
      karsiTaraf: (m.match(/(Çeki veren cari|Karşı taraf):\s*([^\n]+)/) || [])[2] || null,
      islenen: (m.match(/işlenen:\s*([^\n]+)/) || [])[1] || null,
      imza,
    };
  });
  const kapat = () => sayfa.evaluate(() => {
    const k = document.querySelector("#cek-yazdir-alani");
    const b = k && [...k.parentElement.querySelectorAll("button")].find((x) => /Kapat/.test(x.textContent));
    if (b) b.click();
  });

  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(800);

  // 1. Giriş bordrosu.
  await sayfa.locator('[data-cek-yazdir="ck1"]').click();
  await sayfa.waitForTimeout(700);
  const giris = await belge();
  await kapat();
  await sayfa.waitForTimeout(400);

  // 2. Ciro → ciro bordrosu (alıcı USD cari: 1000 $).
  await sayfa.evaluate(() => [...document.querySelectorAll("button")].find((x) => /İşlemler/.test(x.textContent) && x.getBoundingClientRect().width > 0).click());
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Çeki başka bir cariye ver/.test(x.textContent)).click());
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].filter((x) => x.getBoundingClientRect().width > 0).find((x) => [...x.options].some((o) => /Tedarikçi A/.test(o.textContent)));
    s.value = [...s.options].find((o) => /Tedarikçi A/.test(o.textContent)).value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => [...document.querySelectorAll("button")].filter((x) => x.getBoundingClientRect().width > 0 && x.textContent.trim() === "Ciro Et").pop().click());
  await sayfa.waitForTimeout(1200);
  await sayfa.locator('[data-cek-yazdir="ck1"]').click();
  await sayfa.waitForTimeout(700);
  const ciro = await belge();
  const ciroFisi = ((((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1") || {}).hareketler || [])
    .find((h) => /Çek cirosu/.test(h.aciklama || "")) || {};
  ciro.belgeNoCiroFisi = !!ciro.belgeNo && ciro.belgeNo === ciroFisi.fisNo;

  // 3. Pencereyi küçült, ciroyu geri al; şeritten dönünce pencere güncel çeki gösteriyor.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll('button[title="Sekmede bırak, kapatma"]')].find((x) => x.getBoundingClientRect().height > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cek-geri-al="ck1"]').click();
  await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-cek-geri-al="ck1"]').click();
  await sayfa.waitForTimeout(1200);
  const geriAlindiktanSonraDurum = ((((await depoOku(sayfa, "muhasebe:data")) || {}).cekler || [])[0] || {}).durum;
  // Geçmiş: giriş + ciro + geri alma satırları, her birinin yazdır düğmesi.
  await sayfa.locator('[data-cek-ayrinti="ck1"]').click();   // v1.461.0: "Geçmiş" → "Ayrıntı"
  await sayfa.waitForTimeout(400);
  const gecmisYazdirDugmeleri = await sayfa.evaluate(() => ({
    giris: document.querySelectorAll("[data-cek-giris-yazdir]").length,
    islemler: document.querySelectorAll("[data-cek-gecmis-yazdir]").length,
  }));
  // Geri alma satırının belgesi.
  await sayfa.evaluate(() => { const d = [...document.querySelectorAll("[data-cek-gecmis-yazdir]")].pop(); d.click(); });
  await sayfa.waitForTimeout(700);
  const iptal = await belge();

  await tarayici.close();
  return { hatalar, giris, ciro, geriAlindiktanSonraDurum, gecmisYazdirDugmeleri, iptal: { ad: iptal && iptal.ad, imzaVar: !!(iptal && iptal.imza.length) } };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
