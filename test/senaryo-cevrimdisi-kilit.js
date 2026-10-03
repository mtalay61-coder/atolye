// SENARYO — İNTERNET YOKKEN KİLİT (v1.557.0).
// Kullanıcı: "İnternet olmayınca uygulama çalışmayı durdursun. Kökten çözüm."
//   A) Buluta ulaşılamadan açılış (ağ yok) → tam ekran kilit ("buluta ulaşamadan açıldı"), menüye basılamaz.
//   B) Bulut açıkken internet kopar ("offline") → kilit; geri gelir ("online" + yoklama cevap alır) → kilit kalkar.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  // ---- A ----
  let { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false, cevrimdisiKilidi: true });
  await sayfa.waitForTimeout(2500);
  const kilitA = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-cevrimdisi-kilit]");
    return k ? { var: true, yerel: /buluta ulaşamadan açıldı/.test(k.innerText) } : { var: false };
  });
  // Menüye tıklama denemesi: kilit üstte, tıklama ona gider.
  const ust = await sayfa.evaluate(() => {
    const b = document.querySelector('[data-nav="Planlama"]');
    if (!b) return "menü yok";
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el && el.closest("[data-cevrimdisi-kilit]") ? "kilit üstte" : "menü erişilebilir";
  });
  await tarayici.close();

  // ---- B ---- bulut "açık": bütün REST istekleri boş cevap alır.
  const onceRota = async (s) => {
    await s.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await s.route("**/auth/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  };
  ({ tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false, cevrimdisiKilidi: true, onceRota }));
  await sayfa.waitForTimeout(2500);
  const kilitVar = () => sayfa.evaluate(() => !!document.querySelector("[data-cevrimdisi-kilit]"));
  const acikBaslangic = await kilitVar();
  await sayfa.evaluate(() => window.dispatchEvent(new Event("offline")));
  await sayfa.waitForTimeout(1000);
  const offlineSonra = await kilitVar();
  await sayfa.evaluate(() => window.dispatchEvent(new Event("online")));
  await sayfa.waitForTimeout(1200);
  const onlineSonra = await kilitVar();
  await tarayici.close();
  return { A: { kilit: kilitA, menu: ust }, B: { baslangictaKilit: acikBaslangic, offlineSonra, onlineSonra } };
}
if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
