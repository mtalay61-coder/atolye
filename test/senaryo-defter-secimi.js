// SENARYO — DEFTER SEÇİMİ OLMAYAN YERLER (v1.543.0).
//
// Kullanıcı: "Resmi defter olmayan yer kaldı mı?" → "İşçilik genele yazılsın, tanımlarsa ayar mantıklı.
// Diğerlerini yap."
//   1. Tanımlar › Firma: işçilik defteri ayarı (varsayılan Genel), seçim kaydediliyor.
//   2. Cari Hesaplar: Tümü/Genel/Resmi — satır bakiyesi ve dip toplam seçilen deftere göre.
//   3. Fişler: defter süzgeci + Resmi rozeti.
//   4. Kâr-Zarar: Tümü/Genel/Resmi seçimi satış gelirini değiştiriyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const bugun = new Date().toISOString().slice(0, 10);
  const h = (id, fisNo, tutar, defter, islemTipi = "Satış") => ({ id, tarih: bugun, zaman: `${bugun}T09:00:00.000Z`, yon: "Borç", tutar,
    paraBirimi: "TRY", odemeSekli: "Nakit", islemTipi, fisNo, aciklama: fisNo, defter });
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c2"
    ? { ...c, hareketler: [h("hg", "SF-G-1", 1000, "Genel"), h("hr", "SF-R-1", 400, "Resmi"), h("hm", "SF-M-1", 50, "Muhasebe")] }
    : c)));
  // Satışların stok ayağı (kâr-zarar geliri cari ayağından okuyor; kimlik ortak).
  const stok = JSON.parse(t["stok:items"]);
  const m = stok.find((u) => u.kategori === "Mamul") || stok[0];
  const sh = (id, fisNo) => ({ id, tarih: `${bugun}T09:00:00.000Z`, renk: (m.variants[0] || {}).renk, beden: (m.variants[0] || {}).beden, miktar: -1, kaynak: "Satış", fisNo, cariId: "c2" });
  m.hareketler = [sh("hg", "SF-G-1"), sh("hr", "SF-R-1"), sh("hm", "SF-M-1"), ...(m.hareketler || [])];
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const tikla = async (sec) => { await sayfa.locator(`${sec}:visible`).first().click(); await sayfa.waitForTimeout(300); };

  // ---- 1. TANIMLAR › FİRMA ----------------------------------------------------------------------------
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-tanim-sekme="firma"]').first().click();
  await sayfa.waitForTimeout(400);
  const ayarVarsayilan = await sayfa.locator("[data-iscilik-defteri]").first().inputValue();
  await sayfa.locator("[data-iscilik-defteri]").first().selectOption("Resmi");
  await sayfa.waitForTimeout(500);
  const kaydedilen = ((((await depoOku(sayfa, "tanimlar:data")) || {}).firmaBilgileri) || {}).iscilikDefteri;

  // ---- 2. CARİ HESAPLAR --------------------------------------------------------------------------------
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(800);
  const cariDurum = () => sayfa.evaluate(() => ({
    satir: ((document.querySelector('[data-cari-liste-bakiye="Müşteri B"]') || {}).textContent || "").replace(/\s+/g, " ").trim(),
    dip: ((document.querySelector("[data-cari-liste-toplam]") || {}).textContent || "").replace(/\s+/g, " ").trim(),
  }));
  const cari = {};
  for (const d of ["Tümü", "Genel", "Resmi"]) { await tikla(`[data-cari-defter-sec="${d}"]`); cari[d] = await cariDurum(); }
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });

  // ---- 3. FİŞLER ----------------------------------------------------------------------------------------
  await modulAc(sayfa, "Fişler");
  await sayfa.waitForTimeout(800);
  const fisNolari = () => sayfa.evaluate(() => ["SF-G-1", "SF-R-1", "SF-M-1"].filter((no) =>
    [...document.querySelectorAll("span")].some((s) => s.offsetParent && s.textContent.trim() === no)));
  const fisler = {};
  for (const d of ["Tümü", "Genel", "Resmi"]) { await tikla(`[data-fis-defter-sec="${d}"]`); fisler[d] = await fisNolari(); }
  await tikla('[data-fis-defter-sec="Tümü"]');
  const rozetler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-defter-rozet]")].filter((x) => x.offsetParent)
    .map((x) => x.textContent.trim()).sort());

  // ---- 4. KÂR-ZARAR -------------------------------------------------------------------------------------
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Kâr \/ Zarar/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const gelir = () => sayfa.evaluate(() => {
    const m2 = document.body.innerText.replace(/\n/g, " | ");
    const i = m2.indexOf("Satış geliri");
    return i < 0 ? null : m2.slice(i, i + 60).split("|")[1].trim();
  });
  const kz = {};
  for (const d of ["Tümü", "Genel", "Resmi"]) { await tikla(`[data-kz-defter="${d}"]`); kz[d] = await gelir(); }

  await tarayici.close();
  return { hatalar, iscilikAyari: { varsayilan: ayarVarsayilan, kaydedilen }, cari, fisler, rozetler, karZararSatisGeliri: kz };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
