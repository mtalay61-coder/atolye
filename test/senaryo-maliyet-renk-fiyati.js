// SENARYO — MALİYETTE RENK FİYATI KARTI EZMİYOR (5 Ekim, v1.591.0).
// Kullanıcı: "Maliyette aynı stoğun farklı renklerinin fiyatını değişince diğer renkleri de değiştiriyor; burada renk
// değişince diğerleri değişmesin ve o renk için stoğa alış fiyatı hatırlasın, stokta maliyet bu şekilde yapıldı diye
// bilgi versin." Ölçülen: Bot reçetesinde Deri Siyah (kart alış 100 ₺, renk kuralı yok). Maliyet'te Siyah'ı 120 yapınca:
// Deri kartı alış fiyatı 100 KALIR, Siyah için renk kuralı 120 (kaynakNotu "Maliyet ekranından: Bot"), Taba kuralsız;
// Deri kartı Fiyatlandırma'da Siyah satırında "maliyetten" rozeti; maliyet dökümünde Siyah 120, Taba 100.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 100; deri.alisParaBirimi = "₺"; deri.fiyatKurallari = [];
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const kartAc = async (nav, ad, sekme) => {
    await sayfa.evaluate((n) => { const b = document.querySelector(`[data-nav="${n}"]`); if (b) b.click(); }, nav);
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === ad && e.getBoundingClientRect().width > 0);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(1100);
    await sayfa.evaluate((s) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(s) && x.offsetParent); if (b) b.click(); }, sekme);
    await sayfa.waitForTimeout(800);
  };
  // v1.595.0: ilk sütun proses; hammadde 2. hücre.
  const dokum = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-maliyet-dokumu] tbody tr")].slice(0, -1).map((tr) => {
    const ad = tr.children[1].textContent.replace(/\s+/g, " ").trim();
    const kutu = tr.querySelector("input[data-maliyet-duzenle]");
    return `${ad}: ${kutu ? kutu.value : tr.children[3].textContent.trim()}`;
  }));
  await kartAc("Mamul Stok", "Bot", "Maliyet");
  const once = await dokum();
  const kutu = sayfa.locator('[data-maliyet-duzenle="hm-u1-Siyah-"]').first();
  await kutu.fill("120"); await kutu.blur(); await sayfa.waitForTimeout(800);
  const sonra = await dokum();
  const stok = await depoOku(sayfa, "stok:items");
  const d = stok.find((p) => p.id === "u1");
  const kayit = {
    kartAlis: d.alisFiyati,
    kurallar: (d.fiyatKurallari || []).map((k) => `${k.kapsam}:${k.deger}=${k.fiyat} ${k.paraBirimi} · ${k.kaynakNotu || "-"}`),
    gecmis: (d.fiyatGecmisi || []).slice(0, 1).map((g) => `${g.etiket} ${g.eskiFiyat} → ${g.yeniFiyat}`),
  };
  // Deri kartı › Fiyatlandırma: Siyah satırında rozet, Taba'da yok.
  await kartAc("Stok", "Deri", "Fiyatlandırma");
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Alış Fiyatı/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const rozet = await sayfa.evaluate(() => ({
    siyah: (() => { const r = document.querySelector('[data-fk-kaynak-notu="Siyah"]'); return r ? `${r.textContent.trim()} · ${r.getAttribute("title").replace(/\d{2}\.\d{2}\.\d{4}/, "GG.AA.YYYY").replace(/\d{2}:\d{2}/, "SS:DD")}` : "yok"; })(),
    taba: !!document.querySelector('[data-fk-kaynak-notu="Taba"]'),
  }));
  await tarayici.close();
  return { hatalar, once, sonra, kayit, rozet };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
