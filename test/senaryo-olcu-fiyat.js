// SENARYO — BEDEN FİYATI FİŞE ÇEKİLİYOR, FİYATLANDIRMA KUTULARI KURALDAN (27 Eylül, v1.482.0).
//
// Kullanıcı (Satış fişi, Mt276 Siyah, fiyat 0; Fiyatlandırma'da Beden 36–40 = 21–25 ₺, beden kutuları
// boş, renk "tek fiyat" kutuları işaretli ve boş): "Bedenlere fiyat girildi ama satışta çekmedi
// fiyatları; fiyatlar girildiği gibi kalmalı, listede beden tek fiyat girildiğinde orada durmalı yine.
// Renk tek fiyat duruyor. İkisi de işaretli olduğunda mantıkta sorun var gibi, kontrol edelim."
//
// Bot'ta yalnız beden kuralları var (40: 21, 41: 22, 42: 23 ₺), genel satış fiyatı yok. Ölçülenler:
//   A. Fiyatlandırma: beden kutuları kural olduğu için İŞARETLİ gelir; renk kutusu (renk kuralı yok)
//      KAPALI gelir; hücrelerde satışta uygulanacak fiyat (beden fiyatı) görünür.
//   B. Satış fişi: miktar kutularının altında her bedenin kural fiyatı; kalemler beden beden 21/22/23
//      ile ekleniyor; fiş satırında "farklı" yerine döküm.
//   C. Fiyat elle yazılınca (30) hepsi 30 — kullanıcının fiyatı kurala üstün.
//   E. (v1.484.0) Bedenlerin fiyatı aynıysa fiyat kutusu kendiliğinden dolar (ipucu yok).
//   D. (v1.483.0) Fiyat kutusu boşaltılınca kural silinir; kapalı kutunun kuralı × ile silinir.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohum(fiyatlar = [["40", 21], ["41", 22], ["42", 23]]) {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.satisFiyati = 0;
  bot.fiyatKurallari = fiyatlar.map(([b, f]) => ({ id: `fk${b}`, tip: "Satış", kapsam: "beden", deger: b, fiyat: f, paraBirimi: "TRY", etiket: `Beden: ${b}` }));
  t["stok:items"] = JSON.stringify(st);
  return t;
}

async function fiyatlandirma(hatalar) {
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fiyatlandırma/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const durum = await sayfa.evaluate(() => {
    const kutu = (v) => { const i = document.querySelector(`[data-fk-hucre="${v}"]`); return i ? `kutu ${i.value}` : "kutu yok"; };
    const tr = [...document.querySelectorAll("tr")].find((x) => x.offsetParent && (x.querySelector("td") || {}).textContent === "Siyah");
    const renkKutusu = tr && tr.querySelector('input[type="checkbox"]');
    return {
      bedenler: Object.fromEntries(["40", "41", "42"].map((b) => [b, kutu(`beden|${b}`)])),
      renkTekFiyat: renkKutusu ? (renkKutusu.checked ? "işaretli" : "kapalı") : "yok",
      hucreIpuclari: ["40", "41", "42"].map((b) => { const i = document.querySelector(`[data-fk-hucre="Siyah|${b}"]`); return i ? `${b}: ${i.placeholder}` : `${b}: ?`; }),
    };
  });
  // Renk kutusunu işaretle: hücreler geçerli fiyatı (beden fiyatı) gri yazar.
  await sayfa.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((x) => x.offsetParent && (x.querySelector("td") || {}).textContent === "Siyah");
    tr.querySelector('input[type="checkbox"]').click();
  });
  await sayfa.waitForTimeout(300);
  durum.renkKilitliHucreler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fk-gecerli]")].map((x) => `${x.getAttribute("data-fk-gecerli")}: ${x.textContent} (${x.title})`));

  // D (v1.483.0). Kullanıcı: "Renk fiyat girip fiyatı silsen bile eski fiyatı hatırlıyor." Renk fiyatı
  // 33 yazılıp kutu boşaltılınca kural silinmeli; kutu boş kalmalı, hücreler beden fiyatına dönmeli.
  const kutuYaz = async (veri, deger) => {
    const k = sayfa.locator(`[data-fk-hucre="${veri}"]`).first();
    await k.fill(deger); await k.blur(); await sayfa.waitForTimeout(400);
  };
  const kurallar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fk-kural]")].map((x) => `${x.getAttribute("data-fk-kural")}: ${x.textContent.replace(/\s+/g, " ").trim()}`));
  await kutuYaz("renk|Siyah", "33");
  durum.renkYazilinca = { kurallar: await kurallar(), hucre40: await sayfa.evaluate(() => document.querySelector('[data-fk-gecerli="Siyah|40"]').textContent) };
  await kutuYaz("renk|Siyah", "");
  durum.renkSilinince = {
    kurallar: await kurallar(),
    kutu: await sayfa.evaluate(() => document.querySelector('[data-fk-hucre="renk|Siyah"]').value),
    hucre40: await sayfa.evaluate(() => document.querySelector('[data-fk-gecerli="Siyah|40"]').textContent),
  };
  // Beden kutusu kapatılınca kural "geçerli" notuyla kalır; × ile silinir.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll('input[type="checkbox"]')].filter((x) => x.offsetParent); const c = b.find((x) => x.closest("td") && x.closest("td").querySelector('[data-fk-hucre="beden|42"]')); if (c) c.click(); });
  await sayfa.waitForTimeout(300);
  durum.bedenKapaninca = await sayfa.evaluate(() => { const n = document.querySelector("[data-fk-kapali-kural]"); return n ? n.textContent : "not yok"; });
  await sayfa.locator('[data-fk-kural-sil="42"]').click();
  await sayfa.waitForTimeout(400);
  durum.xIleSilinince = await kurallar();
  await tarayici.close();
  return durum;
}

async function satisFisi(hatalar, elleFiyat, fiyatlar) {
  const { tarayici, sayfa } = await uygulamaAc(tohum(fiyatlar), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Müşteri B" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-cari-fis-ac="Satış"]').first().click();
  await sayfa.waitForTimeout(700);
  const etiket = await sayfa.evaluate(() => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => /Bot/.test(x.value)) : null;
    return o ? o.value : "Bot";
  });
  await sayfa.locator("[data-urun-arama]").first().fill(etiket);
  await sayfa.waitForTimeout(600);
  // E (v1.484.0): bedenlerin fiyatı aynıysa kutu kendiliğinden dolar; farklıysa boş (genel 0) kalır.
  const kutu = await sayfa.evaluate(() => { const i = document.querySelector("[data-kalem-fiyat]"); return i ? i.value : null; });
  const ipuclari = await sayfa.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-olcu-fiyat]")].filter((x) => x.offsetParent).map((x) => [x.getAttribute("data-olcu-fiyat"), `${x.textContent} (${x.title})`])));
  for (const b of ["40", "41", "42"]) {
    const k = sayfa.locator(`[data-kalem-miktar="${b}"]:visible`).first();
    if (await k.count()) await k.fill("2");
  }
  if (elleFiyat) await sayfa.locator("[data-kalem-fiyat]:visible").first().fill(elleFiyat);
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(600);
  const satir = await sayfa.evaluate(() => {
    const f = document.querySelector("[data-fis-satir-fiyat-farkli]");
    if (f) return `farklı: ${f.textContent}`;
    const i = document.querySelector("[data-fis-satir-fiyat]");
    return i ? `tek: ${i.value}` : "satır yok";
  });
  await tarayici.close();
  return { kutu, ipuclari, satir };
}

async function calistir() {
  const hatalar = [];
  const fiyatlandirmaEkrani = await fiyatlandirma(hatalar);
  const kuraldan = await satisFisi(hatalar, null);
  const elle = await satisFisi(hatalar, "30");
  const ayniFiyat = await satisFisi(hatalar, null, [["40", 25], ["41", 25], ["42", 25]]);
  return { hatalar, fiyatlandirmaEkrani, kuraldan, elle, ayniFiyat };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
