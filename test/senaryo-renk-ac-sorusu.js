// SENARYO — STOK KARTINDA TANIMSIZ RENK: "ORTAK RENK AÇILSIN MI?" (v1.555.0).
//
// Kullanıcı (Aksesuar kartı, "Light" yazılmış, Ekle kapalı): "Renk eklerken renk yok ise ortak açılsın mı diye
// sor ve renk aç, stokta tedarikçideki gibi. Renk açınca renk kodu vs. ne varsa onları da aç, sonra sıkıntı olmasın."
//   1. "taba" (tanımlı, küçük harf) → soru yok, "Taba" eklenir.
//   2. "Light" (tanımsız) → Ekle açık; basınca soru; Vazgeç → hiçbir şey yazılmaz.
//   3. Tekrar → görünüm rengi seçilir → "Evet, renk aç ve ekle": Tanımlar'da Light (renk kodu, barkod kodu,
//      malzeme tipi Aksesuar, görünüm rengi), üründe Light varyantı.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.hammaddeTipleri = [{ id: "ht1", ad: "Aksesuar" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  st.push({ id: "u5", ad: "Aksesuar", kategori: "Hammadde", birim: "adet", olcuTipi: "Serbest", malzemeTipi: "Aksesuar",
    variants: [{ renk: "Siyah", beden: "", miktar: 0 }], hareketler: [], recete: [], alisFiyati: 0.75, alisParaBirimi: "$" });
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Aksesuar" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  const renkEkleAc = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Renk Ekle"); if (b) b.click(); });
  const kutu = () => sayfa.locator("[data-kart-renk-arama]:visible").first();
  const urunRenkleri = async () => [...new Set(((await depoOku(sayfa, "stok:items")).find((u) => u.id === "u5").variants || []).map((v) => v.renk))];

  // 1) tanımlı renk, küçük harfle
  await renkEkleAc(); await sayfa.waitForTimeout(300);
  await kutu().fill("taba");
  await sayfa.locator("[data-kart-renk-ekle]:visible").first().click();
  await sayfa.waitForTimeout(700);
  const tabaSonra = { soru: await sayfa.locator("[data-renk-ac-sorusu]").count(), renkler: await urunRenkleri() };

  // 2) tanımsız: soru + vazgeç
  await renkEkleAc(); await sayfa.waitForTimeout(300);
  await kutu().fill("Light");
  await sayfa.waitForTimeout(150);
  const ekleAcik = await sayfa.locator("[data-kart-renk-ekle]:visible").first().isEnabled();
  await sayfa.locator("[data-kart-renk-ekle]:visible").first().click();
  await sayfa.waitForTimeout(300);
  const soru = await sayfa.locator("[data-renk-ac-sorusu]").first().getAttribute("data-renk-ac-sorusu");
  await sayfa.locator("[data-renk-ac-hayir]").first().click();
  await sayfa.waitForTimeout(400);
  const vazgecSonra = { soru: await sayfa.locator("[data-renk-ac-sorusu]").count(),
    tanimda: ((await depoOku(sayfa, "tanimlar:data")).renkler || []).some((r) => r.ad === "Light"), renkler: await urunRenkleri() };

  // 3) evet
  await sayfa.locator("[data-kart-renk-ekle]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-renk-ac-hex]").first().evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "#e8d9b0"); el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });
  await sayfa.locator("[data-renk-ac-evet]").first().click();
  await sayfa.waitForTimeout(900);
  const light = ((await depoOku(sayfa, "tanimlar:data")).renkler || []).find((r) => r.ad === "Light");
  const sonuc = {
    tanim: light ? { kodVar: /^\d+$/.test(String(light.kod)), barkodKoduVar: light.barkodKodu != null, malzemeTipleri: light.malzemeTipleri, renkKodu: light.renkKodu, tip: light.tip } : null,
    renkler: await urunRenkleri(),
    toast: await sayfa.evaluate(() => /"Light" renk tanımlarına eklendi — renk kodu \d+, barkod kodu \d+ · Aksesuar/.test(document.body.innerText)),
  };
  await tarayici.close();
  return { tabaSonra, ekleAcik, soru, vazgecSonra, sonuc, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
