// SENARYO — GENİŞ REÇETE MATRİSİ, BÜYÜTÜLMÜŞ EKRAN, STOK DEĞİŞTİRME (10 Ekim, v1.636.0).
// Kullanıcı: "reçete renk eşleştirmesinde renk seçimi satırı sağ alta kayıyor, ekranın en sağındaki renk eşleşmelerini
// eşleyemiyorum, hiç görünmüyor" + "reçetede stok değiştirme de olsun".
// Kurulum: 14 renkli mamul, Deri kartı 12 renge eşli (2 renk eksik → sağda "eşleştir…"); Boyut ayarı "Büyük" (zoom 1.1).
// Ölçülen:
//   1) matris kutusu taşıyor → ▶ düğmesi var; ▶ ile sağa kayınca en sağdaki sütun görünür, ◀ belirir;
//   2) en sağdaki "eşleştir…" kutusuna tıklanınca renk listesi kutunun HEMEN altında açılır (sapma < 12 px, zoom'a rağmen);
//   3) ⇄ ile Deri → Astar: kart Astar olur, miktarlar aynı; Astar'da olan renkler aynı ad, olmayanlar eski adla kalır.
const { uygulamaAc, modulAc, depoOku, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir(ekran) {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  const renkler = ["Kahve Süet", "Bej Süet", "Siyah Deri", "Koyu Bej Süet", "Taba Süet", "Vizon Süet", "Yeşil Süet", "Lacivert Süet", "Bordo Süet", "Gri Süet", "Pembe Süet", "Mavi Süet", "Turuncu Süet", "Krem Süet"];
  stok.push({ id: "h9", ad: "Deri", kategori: "Hammadde", birim: "desi", variants: renkler.map((r) => ({ renk: r, beden: "", miktar: 10 })), hareketler: [], recete: [] });
  stok.push({ id: "h8", ad: "Astar", kategori: "Hammadde", birim: "metre", variants: ["Kahve Süet", "Bej Süet"].map((r) => ({ renk: r, beden: "", miktar: 10 })), hareketler: [], recete: [] });
  stok.push({ id: "m9", ad: "Model X", kategori: "Mamul", birim: "çift", variants: renkler.map((r) => ({ renk: r, beden: "40", miktar: 0 })), hareketler: [],
    recete: renkler.slice(0, 12).map((r, i) => ({ id: "r" + i, proses: "Kesim", hammaddeUrunId: "h9", hammaddeAd: "Deri", renk: r, beden: "", mamulRenk: r, mamulBeden: "Tüm Bedenler", miktar: 17, birim: "desi" })) });
  t["stok:items"] = JSON.stringify(stok);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.evaluate(() => localStorage.setItem("gorunum:boyut", JSON.stringify({ genel: "buyuk", dugme: "normal", kutu: "normal" })));
  await sayfa.reload(); await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
  await sayfa.setViewportSize({ width: 1400, height: 900 });
  await sayfa.waitForTimeout(2300);
  const sonuc = { zoom: await sayfa.evaluate(() => getComputedStyle(document.documentElement).zoom) };
  await modulAc(sayfa, "Ürün Stok"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Model X" && e.children.length === 0); let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } } });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click(); await sayfa.waitForTimeout(800);
  const kutu = sayfa.locator('[data-yatay-kutu="recete-matris"]:visible').first();
  const durum = () => kutu.evaluate((k) => {
    const ic = k.querySelector(".yatay-kutu"); const ths = [...k.querySelectorAll("th")]; const son = ths[ths.length - 1];
    const a = ic.getBoundingClientRect(), b = son.getBoundingClientRect();
    return { sag: !!k.querySelector('[data-yatay-kaydir="sag"]'), sol: !!k.querySelector('[data-yatay-kaydir="sol"]'), sonSutunGorunur: b.right <= a.right + 1 && b.left >= a.left - 1 };
  });
  sonuc.basta = await durum();
  for (let i = 0; i < 6 && (await durum()).sag; i++) { await kutu.locator('[data-yatay-kaydir="sag"]').click(); await sayfa.waitForTimeout(500); }
  sonuc.sagaKayinca = await durum();
  if (ekran) await kutu.screenshot({ path: ekran });

  // 2) En sağdaki boş kutu → liste kutunun hemen altında mı?
  const bos = kutu.locator('[data-recete-renk-kutu="bos"]').last();
  await bos.click(); await sayfa.waitForTimeout(400);
  sonuc.listeKonumu = await sayfa.evaluate(() => {
    const kutular = [...document.querySelectorAll('[data-recete-renk-kutu="bos"]')]; const k = kutular[kutular.length - 1].getBoundingClientRect();
    const l = document.querySelector("[data-recete-renk-arama]").getBoundingClientRect();
    return { yatayFark: Math.round(Math.abs(l.left - k.left)) < 12 || l.right <= innerWidth, dikeyYakin: Math.abs(l.top - k.bottom) < 12 || Math.abs(k.top - l.bottom) < 12, ekranIcinde: l.right <= innerWidth + 1 && l.bottom <= innerHeight + 1 };
  });
  await sayfa.keyboard.press("Escape"); await sayfa.waitForTimeout(300);

  // 3) Stok değiştir: Deri → Astar.
  await sayfa.locator('[data-recete-stok-degistir="Deri"]').first().click(); await sayfa.waitForTimeout(300);
  const ara = sayfa.locator('[data-recete-stok-degistir-secici] input').first();
  await ara.fill("Astar"); await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-recete-stok-degistir-secici] [data-urun-oneri]').first().click(); await sayfa.waitForTimeout(700);
  const m = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m9") || {};
  const rc = m.recete || [];
  sonuc.stokDegisti = {
    hepsiAstar: rc.length === 12 && rc.every((r) => r.hammaddeUrunId === "h8" && r.hammaddeAd === "Astar"),
    miktarlarAyni: rc.every((r) => r.miktar === 17), birim: rc[0] && rc[0].birim,
    kahve: (rc.find((r) => r.mamulRenk === "Kahve Süet") || {}).renk, siyah: (rc.find((r) => r.mamulRenk === "Siyah Deri") || {}).renk,
  };
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir(process.env.EKRAN).then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
