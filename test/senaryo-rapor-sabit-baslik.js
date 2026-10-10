// SENARYO — RAPORDA SABİT BAŞLIK + DETAYLI BAŞLIK ARAMASI (10 Ekim, v1.629.0).
// Kullanıcı: "Raporlarda liste aşağı uzuyor ve aşağı indiğimizde başlıklar yukarıda kalıyor; başlıklar sabit, rapor kısmı
// aşağı inebilsin ve başlık arama olsun. Örneğin 01.01.2026 tarihinde 22900 modelin kırmızı renginden alınan siparişi
// filtreleyebilelim, hatta üretimin hangi aşamasında; sevk edilen ve kalan detaylı filtreli."
// Ölçülen (sipariş raporu, matris görünümü — varsayılan):
//   1. 40 kalemlik raporda tablo kendi kutusunda kayar; kutu 300 px aşağı kaydırılınca başlık satırı kutunun üstünde kalır.
//   2. Arama satırı başlıkla aynı sütun sırasında (resim sütunu varken kayma yok) ve sayı sütunlarında da kutu var.
//   3. Tarih "01.01.2026" + Ürün "22900" + Renk "kırmızı" → yalnız o kalem; Kalan ">0" → teslimi tamamlanmamışlar.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const kalemler = [];
  const urunler = ["22900", "22901", "22902", "22903"];
  const renkler = ["Kırmızı", "Siyah", "Taba", "Bej", "Beyaz"];
  urunler.forEach((u, ui) => renkler.forEach((r, ri) => ["37", "38"].forEach((b) => kalemler.push({
    id: `k${ui}${ri}${b}`, urunId: "u2", urunAd: u, renk: r, beden: b, miktar: 4, karsilanan: ri === 0 && ui === 1 ? 4 : 0,
    birimFiyat: 10, paraBirimi: "TRY", birim: "çift" }))));
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-01-01", kalemler: kalemler.filter((k) => k.urunAd <= "22901") },
    { id: "s2", siparisNo: "SAT-2", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-02-15", kalemler: kalemler.filter((k) => k.urunAd > "22901") },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-ust-sekme="raporlar"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.setViewportSize({ width: 1400, height: 700 }); await sayfa.waitForTimeout(300);

  const sabit = await sayfa.evaluate(async () => {
    const kutu = document.querySelector("[data-rapor-kaydirma]");
    const th = kutu.querySelector("thead tr th");
    const once = Math.round(th.getBoundingClientRect().top - kutu.getBoundingClientRect().top);
    kutu.scrollTop = 300;
    await new Promise((r) => setTimeout(r, 150));
    const sonra = Math.round(th.getBoundingClientRect().top - kutu.getBoundingClientRect().top);
    return { kutuKaydi: kutu.scrollTop > 0, baslikUsttedi: once === 0 && sonra === 0 };
  });
  const aramaSirasi = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    const bas = [...tb.querySelectorAll("thead tr:first-child th")].map((x) => x.textContent.trim());
    const kutular = [...tb.querySelectorAll("[data-rapor-kolon-arama] [data-kolon-arama]")].map((i) => i.getAttribute("data-kolon-arama"));
    return { ilkBaslik: bas[0], kutular };
  });
  const yaz = async (alan, deger) => { await sayfa.locator(`[data-rapor-kolon-arama] [data-kolon-arama="${alan}"]`).first().fill(deger); await sayfa.waitForTimeout(300); };
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-rapor-tablo] tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).slice(0, 9).join(" | ")));
  await yaz("tarih", "01.01.2026"); await yaz("urun", "22900"); await yaz("renk", "kırmızı");
  const suzulmus = await satirlar();
  await yaz("urun", ""); await yaz("renk", ""); await yaz("kalan", ">0");
  const kalanli = (await satirlar()).length;
  await yaz("kalan", "0");
  const bitenler = await satirlar();
  await tarayici.close();
  return { hatalar, sabit, aramaSirasi, suzulmus, kalanliSatir: kalanli, bitenler };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
