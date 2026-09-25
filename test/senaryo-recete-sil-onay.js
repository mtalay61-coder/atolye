// SENARYO — REÇETEDE SİLME ONAYLI (kullanıcı, 11 Eylül).
//
//   "Reçetede stok silme onaylı olsun, tek tıklama ile siliniyor."
//
// Ürün kartının reçete sekmesindeki çöp kutuları `onReceteSilToplu`yu DOĞRUDAN çağırıyordu: bir
// hammaddenin bütün satırları tek dokunuşla gidiyordu. Uygulamanın geri kalanındaki silmeler
// `SilOnayButonu` (iki dokunuş) kullanıyor. Ölçülen: tek dokunuş SİLMİYOR, ikinci dokunuş siliyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // Tohumdaki reçete satırlarının kimliği yok; gerçek kayıtta her satırın kimliği var
  // (`uid("recete")`). Kimliksiz satırda silme bütün reçeteyi götürürdü ve ölçüm anlamsızlaşırdı.
  t["stok:items"] = JSON.stringify(JSON.parse(TOHUM["stok:items"]).map((u) =>
    (u.recete && u.recete.length ? { ...u, recete: u.recete.map((r, i) => ({ ...r, id: `rct-${u.id}-${i}` })) } : u)));

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await sayfa.getByRole("button", { name: "Stok", exact: true }).click();
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(800);

  const receteSayisi = async () => {
    const urunler = await depoOku(sayfa, "stok:items");
    return ((urunler.find((u) => u.id === "u2") || {}).recete || []).length;
  };
  // Hedef: hammadde GRUBU başlığındaki çöp kutusu — o hammaddenin bütün satırlarını siliyor.
  // Görünürlük süzgeci KULLANILMIYOR: test derlemesinde ikon boş `<i>` ve düğmenin dolgusu 0,
  // yani genişliği sıfır ölçülüyor (7z-43'teki ölçüm tuzağının aynısı). Tıklama DOM üzerinden.
  const grupSilDugmesi = () => sayfa.evaluate(() => [...document.querySelectorAll("button[title]")]
    .filter((b) => /hammaddesine ait tüm satırları/.test(b.getAttribute("title")) && b.querySelector('[data-ikon="Trash2"]'))
    .map((b) => b.getAttribute("title")));
  const grupSilTikla = () => sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button[title]")]
      .find((x) => /hammaddesine ait tüm satırları/.test(x.getAttribute("title")));
    if (b) b.click();
  });

  const once = await receteSayisi();
  const dugmeler = await grupSilDugmesi();

  await grupSilTikla();
  await sayfa.waitForTimeout(800);
  const tekDokunus = {
    receteSatiri: await receteSayisi(),
    onaySoruluyor: await sayfa.evaluate(() => [...document.querySelectorAll("button")]
      .some((b) => b.hasAttribute("data-sil-onayla"))),
  };

  let ikinciDokunus = null;
  if (tekDokunus.onaySoruluyor) {
    await sayfa.evaluate(() => {
      const b = document.querySelector("[data-sil-onayla]");
      if (b) b.click();
    });
    await sayfa.waitForTimeout(1000);
    ikinciDokunus = { receteSatiri: await receteSayisi() };
  }

  await tarayici.close();
  return { hatalar, onceReceteSatiri: once, grupSilDugmesi: dugmeler, tekDokunus, ikinciDokunus };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
