// SENARYO — MALİYET SEKMESİ DÜZENLEME (kullanıcı, 21 Eylül: "maliyet tarafında birim fiyatlar
// değiştirilebilir olsun, işçilikler ve genel giderler dahil; reçete ve maliyette boy varsa
// çıksın; boy olan fiyatları maliyet çekmiyor; üretimden ölçülen tüketimi sekmeye taşı, fark
// yoksa gösterme, fark varsa üretim no, stok ve fark").
//
// Ölçülen: (1) boylu hammaddenin fiyatı BOY KURALINDAN geliyor (kart fiyatı 0 iken); (2) birim
// fiyat maliyetten değiştirilince KURALA yazılıyor; (3) çift başı genel gider ürüne özel
// yazılıyor; (4) sapma tablosu yalnız farklı üretimi gösteriyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]); tan.aylikUretimHedefi = 1000; tan.genelGiderler = [{ id: "g1", ad: "Kira", grup: "yonetim", aylikTutar: 20000 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  st.push({ id: "hf", ad: "Fermuar", kategori: "Hammadde", birim: "Çift", alisFiyati: 0, alisParaBirimi: "₺",
    variants: [{ renk: "Siyah", beden: "50 cm", miktar: 100 }], hareketler: [], recete: [], prosesUcretleri: {},
    fiyatKurallari: [{ id: "b2", kapsam: "beden", deger: "50 cm", tip: "Alış", fiyat: 4, paraBirimi: "TRY" }] });
  const bot = st.find((p) => p.id === "u2");
  bot.recete = [{ hammaddeUrunId: "hf", hammaddeAd: "Fermuar", mamulRenk: "Siyah", renk: "Siyah", beden: "50 cm", miktar: 1, birim: "Çift", proses: "Saya" }];
  bot.prosesUcretleri = { Saya: 100 };
  // İki ölçüm: biri reçeteyle aynı (listelenmemeli), biri farklı (10077 · +0,2)
  bot.receteGerceklesme = { "hf|Siyah|50 cm": { olcum: 2, toplam: 2.2, planlanan: 1, sonTarih: "2026-09-20",
    sapmalar: [{ uretimNo: "10077", tarih: "2026-09-20", birimFark: 0.2, toplamFark: 12 }] } };
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const ac = async () => {
    await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate(() => {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    });
    await sayfa.waitForTimeout(1100);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
  };
  await ac();
  const once = await sayfa.evaluate(() => ({
    fermuar: [...document.querySelectorAll("[data-maliyet-dokumu] tbody tr")].map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, " ").trim()).join(" | "))[0],
    sapma: [...document.querySelectorAll("[data-sapma-satir]")].map((r) => [...r.children].map((c) => c.textContent.trim()).join(" | ")),
  }));

  // Birim fiyatı 4 → 5 yap (boy kuralına yazılmalı)
  const kutu = sayfa.locator('[data-maliyet-duzenle^="hm-hf"]').first();
  await kutu.fill("5"); await kutu.blur(); await sayfa.waitForTimeout(700);
  // Genel gider çift başı 20 → 25 (ürüne özel)
  const genel = sayfa.locator('[data-maliyet-duzenle="genel"]').first();
  await genel.fill("25"); await genel.blur(); await sayfa.waitForTimeout(700);

  const stok = await depoOku(sayfa, "stok:items");
  const hf = stok.find((p) => p.id === "hf"); const u2 = stok.find((p) => p.id === "u2");
  await tarayici.close();
  return { hatalar, once,
    sonra: { kural: (hf.fiyatKurallari || []).map((k) => `${k.deger}:${k.fiyat}`), kartFiyati: hf.alisFiyati, genelOzel: u2.genelGiderCiftBasi } };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
