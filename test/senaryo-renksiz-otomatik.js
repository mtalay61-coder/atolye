// SENARYO — RENKSİZ HAMMADDE YENİ RENKTE KENDİLİĞİNDEN (6 Ekim, v1.605.0).
// Kullanıcı (Takviye Bezi, yeni mamul rengi "eşleştir…"): "Standart'ta eşleşme olmayacaktı, yeni renk ekleyince eşleşme
// istedi." + "Hammaddesiz proses de eklenecekti."
// Tohum: Bot'un renkleri Siyah + Taba; Takviye (renksiz, tek "Standart") yalnız Siyah için reçetede; Deri (renkli) de
// yalnız Siyah için. Ölçülen: kart › Reçete açılınca Takviye'nin Taba satırı kendiliğinden Standart ile açılır
// (Takviye kartında "eşleştir" yok, "Renksiz · bedensiz" notu var); Deri yine turuncu "eşleştir…" (renkli, karar
// kullanıcının); "Hammaddesiz proses ekle" satırı aday yokken de görünür. Sayfa hatası yok.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }];   // tek proses → reçetede zaten var → aday yok
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(t["stok:items"]);
  st.push({ id: "tk", ad: "Takviye", kategori: "Hammadde", birim: "metre", olcuTipi: "Serbest", variants: [{ renk: "Standart", beden: "Standart", miktar: 50 }], hareketler: [], recete: [] });
  const bot = st.find((p) => p.id === "u2");
  // Tohumda Bot tek renk (Siyah); ikinci renk Taba, Siyah'ın bedenleriyle (yeni eklenmiş gibi: reçetesi YOK).
  Array.from(new Set(bot.variants.map((v) => v.beden))).forEach((b) => bot.variants.push({ renk: "Taba", beden: b, miktar: 0 }));
  bot.recete = [
    { id: "r1", proses: "Kesim", hammaddeUrunId: "tk", hammaddeAd: "Takviye", renk: "Standart", beden: "Standart", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 0.05, birim: "metre", eklemeId: "e-tk", eklemeTarihi: "2026-09-01T10:00:00.000Z" },
    { id: "r2", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "Standart", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre", eklemeId: "e-deri", eklemeTarihi: "2026-09-01T10:00:00.000Z" },
  ];
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const renkler = Array.from(new Set(bot.variants.map((v) => v.renk)));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Reçete/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);
  const ekran = await sayfa.evaluate(() => {
    const metin = document.body.innerText;
    const bos = document.querySelector("[data-recete-bos-proses]");
    return {
      standartNotu: !!document.querySelector('[data-recete-standart-kart="Takviye"]'),
      eslestirSayisi: (metin.match(/eşleştir…/g) || []).length,
      bosProsesSatiri: bos ? bos.getAttribute("data-recete-bos-proses") : "yok",
      bosProsesMetni: bos ? bos.innerText.replace(/\s+/g, " ").trim().slice(0, 60) : "",
    };
  });
  const u = (await depoOku(sayfa, "stok:items")).find((x) => x.id === "u2");
  const takviye = u.recete.filter((r) => r.hammaddeUrunId === "tk").map((r) => `${r.mamulRenk}:${r.renk}:${r.miktar}`).sort();
  const deri = u.recete.filter((r) => r.hammaddeUrunId === "u1").map((r) => `${r.mamulRenk}:${r.renk}`).sort();
  await tarayici.close();
  return { renkler, ekran, takviye, deri, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
