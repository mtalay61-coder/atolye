// SENARYO — SAĞ TIK KARTIN HER YERİNDE + LİSTEDE MOR ŞERİT YOK (10 Ekim, v1.637.0).
// Kullanıcı: (sipariş listesi ekran görüntüsüyle) "sağ tık olduğu için mor alan ile üst bilgiyi birleştir, 2 kere aynı
// bilgiler veriyor"; "sağ tık ekranın her yerinde çalışsın".
// Ölçülen:
//   1. Sipariş listesinde açılan kartta mor şerit (belge/sezon/durum tekrarı) yok; özet satırı duruyor.
//   2. Kartın GÖVDESİNE sağ tık işlemler menüsünü açıyor; menüde "Notlar (3)" → notlar penceresi.
//   3. Ürün kartının gövdesine (şerit dışı, sekme alanı) sağ tık ürün menüsünü açıyor.
//   4. Yazı/seçim kutusuna (ürün kartındaki kategori seçimi) sağ tıkta kartın menüsü AÇILMIYOR (tarayıcının kopyala/yapıştır menüsü kalır).
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const sagTikEl = (sayfa, el) => sayfa.evaluate((el) => {
  if (!el) return false;
  const b = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: b.left + 5, clientY: b.top + 5 }));
  return true;
}, el);

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, renk, beden, notlar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY", ...(notlar ? { notlar } : {}) });
  t["siparis:data"] = JSON.stringify([
    { id: "n1", siparisNo: "SAT-N1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", belgeNo: "001474", sezon: "2027 Yaz", not: "Kutular logolu",
      kalemler: [k("a", "Siyah", "40", [{ proses: "Kesim", metin: "Deri aynı partiden" }]), k("c", "Kahve", "40", [{ proses: "", metin: "Bağcık bej" }])] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1400, height: 900 });
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-siparis-satir="SAT-N1"]').first().click(); await sayfa.waitForTimeout(800);
  const gorunur = (sec) => sayfa.evaluate((sec) => [...document.querySelectorAll(sec)].filter((x) => x.getBoundingClientRect().width > 0).length, sec);
  const liste = {
    morSerit: await gorunur("[data-siparis-ust-serit]"),
    seritBelge: await gorunur("[data-siparis-serit-belge]"),
    satirBelge: await gorunur("[data-siparis-satir-belge]"),
    satirNot: await gorunur("[data-siparis-satir-not]"),
  };
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 0, width: 1400, height: 520 } });
  // Kartın gövdesi: kalem tablosundaki bir hücre (şerit değil).
  const govde = await sayfa.evaluateHandle(() => [...document.querySelectorAll("td")].find((x) => /Siyah/.test(x.textContent) && x.getBoundingClientRect().width > 0) || null);
  await sagTikEl(sayfa, govde); await sayfa.waitForTimeout(300);
  const menu = await sayfa.evaluate(() => {
    const m = document.querySelector("[data-siparis-islem-menusu]");
    return m ? [...m.querySelectorAll("button")].map((b) => b.textContent.trim()) : null;
  });
  await sayfa.locator('[data-siparis-islem="notlar"]').first().click(); await sayfa.waitForTimeout(300);
  const notPenceresi = await sayfa.evaluate(() => {
    const p = document.querySelector("[data-siparis-not-penceresi]");
    return p ? { genel: (p.querySelector("[data-siparis-not-genel]") || {}).innerText, renk: p.querySelectorAll("[data-siparis-not-renk]").length } : null;
  });
  await sayfa.mouse.click(700, 880); await sayfa.waitForTimeout(200);
  // ÜRÜN KARTI: aç, sekme alanına (şerit dışı) sağ tık.
  await modulAc(sayfa, "Ürün Stok"); await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const s = [...document.querySelectorAll("button")].find((b) => /renk\/beden/.test(b.textContent) && /^Bot/.test(b.textContent.trim())); if (s) s.click(); });
  await sayfa.waitForTimeout(900);
  const urunGovde = await sayfa.evaluateHandle(() => {
    const serit = document.querySelector('[data-urun-kart-serit="Bot"]');
    const kart = serit && serit.parentElement;
    if (!kart) return null;
    return [...kart.querySelectorAll("button, div")].find((x) => !serit.contains(x) && x !== kart && x.getBoundingClientRect().height > 0 && !x.closest("[data-sag-tik-menusu]")) || null;
  });
  await sagTikEl(sayfa, urunGovde); await sayfa.waitForTimeout(300);
  const urunMenu = await sayfa.evaluate(() => { const m = document.querySelector('[data-sag-tik-menusu="urun"]'); return m ? (m.innerText.split("\n")[0] || "").trim() : null; });
  await sayfa.keyboard.press("Escape"); await sayfa.waitForTimeout(150);
  const urunInput = await sayfa.evaluateHandle(() => {
    const serit = document.querySelector('[data-urun-kart-serit="Bot"]');
    const kart = serit && serit.parentElement;
    return kart ? [...kart.querySelectorAll("input, select")].find((x) => x.getBoundingClientRect().width > 0) || null : null;
  });
  const urunInputVar = await sayfa.evaluate((e) => !!e, urunInput);
  if (urunInputVar) { await sagTikEl(sayfa, urunInput); await sayfa.waitForTimeout(300); }
  const urunInputtaMenuYok = await sayfa.evaluate(() => !document.querySelector('[data-sag-tik-menusu="urun"]'));
  await tarayici.close();
  return { hatalar, liste, menu, notPenceresi, urunMenu, urunInputVar, urunInputtaMenuYok };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
