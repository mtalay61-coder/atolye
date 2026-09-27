// SENARYO — RENKSİZ / BEDENSİZ HAMMADDE REÇETEDE (27 Eylül, v1.493.0).
//
// Kullanıcı (reçete ▸ "Monta Çivisi": her mamul rengi için boş "Renk seçin…" + "⚠ eşleşmedi", "Beden
// Eşleştirme 36 → —", "rengi kim belirlesin?" sorusu): "Renksiz bedensiz stok için sıkıntı devam ediyor.
// Uygulama renksiz bedensiz stoğu standart renk ve bedenli olarak mı görüyor?" Karar tek yerde
// (012 `urunRenksizMi` / `urunBedensizMi`): bütün renk (beden) değerleri yer tutucu ya da hiç yok.
//
// Dört hammadde, Çizme'ye (Kahve Süet, Siyah × 40, 41) eklenir:
//   A. renk/beden "Standart"          B. renk/beden boş ("")          C. HİÇ varyant yok
//   D. renksiz ama bedenli (40, 41 — isimle eşleşir)
// Ölçülenler (her biri için): renk eşleştirme kutusu yok, "rengi kim belirlesin" sorusu yok, renksiz
// bilgisi var; A-C'de beden eşleştirmesi yok ("Bedensiz —"), D'de var. Ekleyince satırlar: mamul renk
// başına tek satır, renk "Standart"; A-C "Tüm Bedenler", D beden beden.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const HAMMADDELER = [
  { id: "ha", ad: "Çivi Standart", variants: [{ renk: "Standart", beden: "Standart", miktar: 100, minStok: 0 }] },
  { id: "hb", ad: "Çivi Boş Kayıt", variants: [{ renk: "", beden: "", miktar: 100, minStok: 0 }] },
  { id: "hc", ad: "Çivi Varyantsız", variants: [] },
  { id: "hd", ad: "Taban Bedenli", variants: ["40", "41"].map((b) => ({ renk: "", beden: b, miktar: 50, minStok: 0 })) },
];

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  HAMMADDELER.forEach((h) => stok.push({ ...h, kategori: "Hammadde", birim: "adet", hareketler: [] }));
  stok.push({ id: "cz", ad: "Çizme", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", recete: [], hareketler: [],
    variants: ["Kahve Süet", "Siyah"].flatMap((r) => ["40", "41"].map((b) => ({ renk: r, beden: b, miktar: 0, minStok: 0 }))) });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Çizme" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(600);

  const sonuc = {};
  for (const h of HAMMADDELER) {
    const kutu = sayfa.locator('input[placeholder="Hammadde ara…"]:visible').first();
    await kutu.click();
    await kutu.fill(h.ad);
    await sayfa.waitForTimeout(300);
    if (process.env.HATA_AYIKLA) console.log(await sayfa.evaluate(() => [...document.querySelectorAll("button")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim().slice(0, 40)).filter((x) => /Çivi|Taban/.test(x)).join(" | ")));
    // "… adıyla yeni ekle" önerisi değil, mevcut kayıt: metni adla BAŞLAYAN düğme.
    await sayfa.evaluate((ad) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && x.textContent.trim().startsWith(ad));
      if (b) b.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }, h.ad);
    await sayfa.waitForTimeout(500);
    if (process.env.HATA_AYIKLA) console.log(h.ad, await sayfa.evaluate(() => [...document.querySelectorAll("label")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim().slice(0, 30)).join(" | ")));
    const ekran = await sayfa.evaluate(() => {
      const gorunur = (x) => x && x.getBoundingClientRect().width > 0;
      const metin = document.body.innerText;
      return {
        renkKutusu: [...document.querySelectorAll("[data-recete-renk-eslesme]")].filter(gorunur).length,
        renksizBilgisi: [...document.querySelectorAll("[data-recete-renksiz]")].some(gorunur),
        ambalajSorusu: /rengi kim belirlesin/.test(metin),
        eslesmediUyarisi: /eşleşmedi/.test(metin),
        beden: /Bedensiz —/.test(metin) ? "Bedensiz" : (/Beden Eşleştirme/.test(metin) ? "Beden Eşleştirme" : "yok"),
      };
    });
    await sayfa.evaluate(() => {
      const l = [...document.querySelectorAll("label")].find((x) => /^Miktar \(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
      const i = l && l.querySelector("input");
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(i, "2"); i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await sayfa.waitForTimeout(150);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && x.textContent.trim() === "Reçeteye Ekle"); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
    const cizme = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "cz") || {};
    const satirlar = (cizme.recete || []).filter((r) => r.hammaddeUrunId === h.id)
      .map((r) => `${r.mamulRenk}/${r.mamulBeden} → ${r.renk}/${r.beden} × ${r.miktar}`).sort();
    sonuc[h.ad] = { ...ekran, satirlar };
  }

  await tarayici.close();
  return { hatalar, sonuc };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
