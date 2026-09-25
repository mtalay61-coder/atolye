// SENARYO — REÇETE HAMMADDE ÖNERİ LİSTESİ KIRPILMIYOR.
//
// Ürün kartının dış kutusunda köşeleri yuvarlatmak için `overflow: hidden` vardı; kartın içindeki
// açılır öneri listesini de kırpıyordu. Kullanıcı listenin alt kısmını hiç göremiyordu
// ("ekran tam olmuyor"). Bu senaryo listenin bir ATA TARAFINDAN KESİLMEDİĞİNİ ölçüyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Pencere KISA tutuluyor: liste aşağı sığmasın ve yukarı açılma dalı da sınansın. Asıl hata
// telefonda, yani dar ekranda görülmüştü.
async function calistir(yukseklik = 520) {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  await sayfa.setViewportSize({ width: 1400, height: yukseklik });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('input[placeholder="Hammadde ara…"]').click();
  await sayfa.waitForTimeout(600);

  const olcum = await sayfa.evaluate(() => {
    const liste = [...document.querySelectorAll("div")].find((d) => {
      const st = getComputedStyle(d);
      return st.position === "absolute" && st.overflowY === "auto" && d.getBoundingClientRect().width > 0;
    });
    if (!liste) return { listeVar: false };
    const lr = liste.getBoundingClientRect();
    // Listeyi kesebilecek en yakın kap (pencerenin kaydırma alanı).
    let kap = null;
    let p = liste.parentElement;
    while (p) {
      const st = getComputedStyle(p);
      if (st.overflow !== "visible" || st.overflowY !== "visible") { kap = p; break; }
      p = p.parentElement;
    }
    const kr = kap ? kap.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return {
      listeVar: true,
      // ASIL ÖLÇÜ: listenin tamamı kabın içinde mi? Kırpılıyorsa kullanıcı alt satırları göremez.
      tamamiGorunuyor: lr.top >= kr.top - 1 && lr.bottom <= kr.bottom + 1,
      listeYuksekligiVar: lr.height > 0,
    };
  });

  await tarayici.close();
  return { hatalar, olcum };
}

if (require.main === module) {
  Promise.all([calistir(950), calistir(520)]).then(([genis, dar]) => {
    const s = { genisEkran: genis, darEkran: dar };
    const hatalar = [...genis.hatalar, ...dar.hatalar];
    if (hatalar.length) console.log("SAYFA HATASI:", hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
