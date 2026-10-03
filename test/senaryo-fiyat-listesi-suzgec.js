// SENARYO — FİYAT LİSTESİNDE STOK RESMİ + ÖZEL KOD SÜZGECİ (v1.553.0).
//
// Kullanıcı: "Fiyatlandırmada resim de olsun, stok resmi görünsün ve özel kodlarla filtrelenebilsin."
//   1. Her satırda resim: kapak resmi, yoksa renk resmi, hiç yoksa yer tutucu; tıklayınca büyür.
//   2. Özel kod kutuları yalnız dolu alanlar için; Sezon 2026 → iki model; + Taban Kauçuk → bir model.
//   3. Arama özel kod değerini de bulur.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.ozelKodAlanlari = [{ id: "oka-s", ad: "Sezon", kapsamTuru: "genel" }, { id: "oka-t", ad: "Taban", kapsamTuru: "genel" }, { id: "oka-bos", ad: "Boş alan", kapsamTuru: "genel" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((u) => u.id === "u2");
  bot.kapakResmi = PNG;
  bot.ozelKodlar = { "oka-s": "2026", "oka-t": "Kauçuk" };
  const yeni = (id, ad, ek) => ({ ...bot, id, ad, stokNo: "", kapakResmi: "", hareketler: [], fiyatKurallari: [], ...ek });
  st.push(yeni("u7", "Çizme", { ozelKodlar: { "oka-s": "2026", "oka-t": "Deri" }, renkResimleri: { Siyah: PNG } }));
  st.push(yeni("u8", "Babet", { ozelKodlar: { "oka-s": "2025" } }));
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Fiyat Listesi");
  await sayfa.waitForTimeout(500);
  const kok = "[data-fiyat-listesi]";
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fiyat-listesi] [data-fl-satir]")].map((tr) => tr.getAttribute("data-fl-satir")));
  const resimler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fiyat-listesi] [data-fl-resim]")].map((i) => i.getAttribute("data-fl-resim")));
  const kutular = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fiyat-listesi] [data-fl-ozel-kod]")].map((s) => ({
    ad: s.getAttribute("data-fl-ozel-kod"), secenekler: [...s.options].map((o) => o.textContent) })));
  const hepsi = await satirlar();
  await sayfa.locator(`${kok} [data-fl-ozel-kod="Sezon"]`).first().selectOption("2026");
  await sayfa.waitForTimeout(200);
  const sezon = await satirlar();
  await sayfa.locator(`${kok} [data-fl-ozel-kod="Taban"]`).first().selectOption("Kauçuk");
  await sayfa.waitForTimeout(200);
  const ikiAlan = await satirlar();
  await sayfa.locator(`${kok} [data-fl-ozel-temizle]`).first().click();
  await sayfa.locator(`${kok} input[placeholder="Listede ara…"]`).first().fill("2025");
  await sayfa.waitForTimeout(200);
  const arama = await satirlar();
  await sayfa.locator(`${kok} input[placeholder="Listede ara…"]`).first().fill("");
  await sayfa.locator(`${kok} [data-fl-resim="Bot"]`).first().click();
  await sayfa.waitForTimeout(200);
  const buyuk = await sayfa.locator("[data-fl-resim-buyuk]").count();
  await sayfa.locator("[data-fl-resim-buyuk]").first().click();
  await sayfa.waitForTimeout(200);
  const kapandi = (await sayfa.locator("[data-fl-resim-buyuk]").count()) === 0;
  // EXCEL + YAZDIR (v1.554.0): süzgeç (Sezon 2026) uygulanmışken — çıktı ekrandakini taşır.
  await sayfa.locator(`${kok} [data-fl-ozel-kod="Sezon"]`).first().selectOption("2026");
  await sayfa.waitForTimeout(200);
  await sayfa.locator(`${kok} [data-fl-excel]`).first().click();
  await sayfa.waitForTimeout(300);
  const excel = await sayfa.evaluate(() => (window.__sonFiyatListesiExcel || []).map((r, i) => (i === 0 ? [r[0]] : r)));
  await sayfa.locator(`${kok} [data-fl-yazdir]`).first().click();
  await sayfa.waitForTimeout(300);
  const yazdir = await sayfa.evaluate(() => {
    const d = document.createElement("div"); d.innerHTML = window.__sonFiyatListesiYazdir || "";
    return { satir: [...d.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].slice(1, 3).map((td) => td.textContent.trim()).join(" ")),
      resim: d.querySelectorAll("tbody img").length };
  });
  await tarayici.close();
  return { resimler, kutular, hepsi, sezon, ikiAlan, arama, buyuk, kapandi, excel, yazdir, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
