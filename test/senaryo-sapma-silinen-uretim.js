// SENARYO — SAPMA TABLOSU YALNIZ VAR OLAN ÜRETİMLERDEN (5 Ekim, v1.592.0).
// Kullanıcı (27080 D › Maliyet, "4 ölçüm ort." satırları): "Üretim yapıldı ve üretimler silindi, eski üretimdeki farkları
// hesapladı; üretimdeki farkları hesaplarken gerçekleşen üretimden alsın, silinenleri almasın."
// Ölçülen: Bot'ta Deri Siyah için iki ölçüm — 1001 (tohumda var) +0,3 ve 9999 (silinmiş) +0,5. Maliyet'te yalnız 1001
// satırı; sonra 1001 üretimi silinince tablo kalkıyor ve mamuldeki ölçüm kaydı temizleniyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.receteGerceklesme = { "u1|Siyah|": { olcum: 2, toplam: 4.8, planlanan: 2, sonTarih: "2026-09-21",
    sapmalar: [{ uretimNo: "9999", tarih: "2026-09-21", birimFark: 0.5, toplamFark: 5 }, { uretimNo: "1001", tarih: "2026-09-20", birimFark: 0.3, toplamFark: 3 }],
    olcumler: [{ uretimNo: "9999", tarih: "2026-09-21", gerceklesen: 2.5, planlanan: 2, toplamFark: 5 }, { uretimNo: "1001", tarih: "2026-09-20", gerceklesen: 2.3, planlanan: 2, toplamFark: 3 }] } };
  t["stok:items"] = JSON.stringify(st);
  // Üretim silme adım adım BULUTA yazar (076 adimlariYurut, yazma düşerse durur); ağsız koşuda bulut çağrıları
  // başarılı sayılsın diye Supabase REST'i boş/olumlu cevapla karşılıyoruz.
  const onceRota = async (s2) => {
    // Yalnız YAZMALAR olumlu; okumalar yine düşsün (açılış tabanı tohumdan gelsin — bulut boş dönse tohum silinirdi).
    await s2.route("**/rest/v1/**", (route) => (route.request().method() === "GET"
      ? route.abort()
      : route.fulfill({ status: 200, contentType: "application/json", body: "[]" })));
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2500);
  const maliyetAc = async () => {
    await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate(() => {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    });
    await sayfa.waitForTimeout(1100);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
  };
  const sapma = () => sayfa.evaluate(() => ({
    blokVar: !!document.querySelector("[data-uretim-sapmalari]"),
    satirlar: [...document.querySelectorAll("[data-sapma-satir]")].map((r) => [...r.children].map((c) => c.textContent.trim()).join(" | ")),
  }));
  await maliyetAc();
  const once = await sapma();
  // 1001 üretimini sil.
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(800);
  await sayfa.getByText("1001", { exact: true }).last().click();
  await sayfa.waitForTimeout(800);
  await sayfa.locator("[data-uretim-sil]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Evet, Sil/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const uretimler = ((await depoOku(sayfa, "uretim:siparisler")) || []).map((u) => u.siparisNo);
  const gerceklesme = (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).receteGerceklesme;
  await maliyetAc();
  const sonra = await sapma();
  await tarayici.close();
  return { hatalar, once, silmeSonrasi: { uretimler, gerceklesme }, sonra };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
