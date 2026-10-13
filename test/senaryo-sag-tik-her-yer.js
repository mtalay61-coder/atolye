// SENARYO — SAĞ TIK MENÜSÜ HER EKRANDA (10 Ekim, v1.636.0).
// Kullanıcı: "sol tıklama olsun, ekranda gizlemek istediğimiz menüler özellikler sağ tıklama ile yapalım" → "sağ mantığını
// her yer için yapalım". Ölçülen: cari kartı, ürün kartı, fiş kartı ve üretim kartında sağ tık menüsü açılıyor, beklenen
// öğeleri taşıyor; şeritteki eski düğmeler (pasif/sil ikonları, Barkod/İş Emri, fişteki "İşlemler") yok; Esc kapatıyor;
// menüden "Pasife al" gerçekten yazıyor.
const { uygulamaAc, modulAc, depoOku, sagTikAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir(ekran) {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const menu = () => sayfa.evaluate(() => {
    const m = document.querySelector("[data-sag-tik-menusu]");
    return m ? { tur: m.getAttribute("data-sag-tik-menusu"), ogeler: [...m.querySelectorAll("[data-sag-tik]")].map((b) => b.getAttribute("data-sag-tik") + (b.disabled ? "(pasif)" : "")) } : null;
  });
  const kapat = async () => { await sayfa.keyboard.press("Escape"); await sayfa.waitForTimeout(200); };
  const sonuc = {};

  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(600);
  await sagTikAc(sayfa, '[data-cari-kart-serit="Müşteri B"]'); await sayfa.waitForTimeout(300);
  sonuc.cari = await menu();
  if (ekran) await sayfa.screenshot({ path: ekran, clip: { x: 0, y: 280, width: 1000, height: 520 } });
  await sayfa.locator('[data-sag-tik-menusu] [data-sag-tik="pasif"]').click(); await sayfa.waitForTimeout(600);
  sonuc.cariPasifYazildi = !!(((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {}).pasif;
  sonuc.cariSeritteIkonYok = await sayfa.evaluate(() => !document.querySelector('[data-cari-kart-serit] [data-kart-eylem="pasif"], [data-cari-kart-serit] [data-kart-eylem="sil"]'));

  await modulAc(sayfa, "Ürün Stok"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0); let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } } });
  await sayfa.waitForTimeout(900);
  await sagTikAc(sayfa, '[data-urun-kart-serit="Bot"]'); await sayfa.waitForTimeout(300);
  sonuc.urun = await menu();
  await sayfa.locator('[data-sag-tik-menusu] [data-sag-tik="sekme-recete"]').click(); await sayfa.waitForTimeout(700);
  sonuc.receteSekmesiAcildi = await sayfa.evaluate(() => /Reçete/.test((document.querySelector('[aria-selected="true"], .sekme-aktif') || {}).textContent || "") || !!document.querySelector("[data-recete-onay], [data-recete-kart]"));

  await modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(600);
  sonuc.fisteIslemlerDugmesiYok = await sayfa.evaluate(() => !document.querySelector("[data-fis-islemler]"));
  await sagTikAc(sayfa, '[data-fis-kart="1001-Kesim"]'); await sayfa.waitForTimeout(300);
  sonuc.fis = await menu();
  await kapat();
  sonuc.escKapatti = !(await menu());

  await modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(600);
  sonuc.uretimSeritteBarkodYok = await sayfa.evaluate(() => ![...document.querySelectorAll("[data-uretim-kart-serit] button")].some((b) => /Barkod|İş Emri/.test(b.textContent)));
  await sagTikAc(sayfa, "[data-uretim-kart-serit]"); await sayfa.waitForTimeout(300);
  sonuc.uretim = await menu();
  await kapat();
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir(process.env.EKRAN).then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
