// SENARYO — FİYAT GRUBU DÜZENLEME (kullanıcı, 21 Eylül: "fiyat grubu"). Para birimi alanı
// v1.398'de eklendi; ondan önce açılmış gruplar TL sayılıyordu ve tek yol silip yeniden açmaktı.
//
// Ölçülen: (1) Tanımlar'da grubun para birimi satır içinde USD yapılıyor, kalıcı; (2) ürün
// kartında o gruba TL ile kayıtlı eski fiyat "birim uyuşmuyor" uyarısı alıyor; (3) "Öneriye
// eşitle" fiyatı grubun GÜNCEL birimiyle (USD) yeniden yazıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  // Eski usul grup: para birimi YOK (TL sayılır)
  tan.fiyatGruplari = [{ id: "fg1", ad: "Toptan USD", tip: "Satış" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1"); deri.alisFiyati = 2; deri.alisParaBirimi = "$";
  const bot = st.find((p) => p.id === "u2");
  bot.recete = [{ hammaddeUrunId: "u1", hammaddeAd: "Deri", mamulRenk: "Siyah", renk: "Siyah", beden: "", miktar: 2, birim: "desi", proses: "Kesim" }];
  bot.prosesUcretleri = { Kesim: 50 }; bot.karMarji = 25;
  // Eski TL fiyat kuralı
  bot.fiyatKurallari = [{ id: "k1", kapsam: "fiyatGrubu", deger: "fg1", tip: "Satış", fiyat: 300, paraBirimi: "TRY", etiket: "Toptan USD" }];
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  // 1) Tanımlar › grubun para birimini USD yap
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-tanim-sekme="urun"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const sekmeBulundu = await sayfa.evaluate(() => !!document.querySelector('[data-fiyat-grubu-pb-duzenle="fg1"]'));
  if (!sekmeBulundu) {
    // Fiyat grupları başka sekmede olabilir: hepsini dene
    for (const k of ["firma", "uretim", "kullanicilar", "yedek"]) {
      await sayfa.evaluate((kk) => { const b = document.querySelector(`[data-tanim-sekme="${kk}"]`); if (b) b.click(); }, k);
      await sayfa.waitForTimeout(400);
      if (await sayfa.evaluate(() => !!document.querySelector('[data-fiyat-grubu-pb-duzenle="fg1"]'))) break;
    }
  }
  await sayfa.evaluate(() => { const s = document.querySelector('[data-fiyat-grubu-pb-duzenle="fg1"]'); s.value = "USD"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sayfa.waitForTimeout(700);
  const grupPb = ((await depoOku(sayfa, "tanimlar:data")).fiyatGruplari.find((g) => g.id === "fg1") || {}).paraBirimi;

  // 2) Ürün › Maliyet: uyarı ve eşitleme
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const uyari = await sayfa.evaluate(() => !!document.querySelector('[data-birim-uyusmaz="fg1"]'));
  await sayfa.locator('[data-fiyat-uygula="fg1"]').click();
  await sayfa.waitForTimeout(800);
  const kural = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").fiyatKurallari || []).map((k) => `${k.deger}:${k.fiyat}:${k.paraBirimi}`);
  const uyariSonra = await sayfa.evaluate(() => !!document.querySelector('[data-birim-uyusmaz="fg1"]'));

  await tarayici.close();
  return { hatalar, grupPb, uyari, kural, uyariSonra };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
