// SENARYO — MÜŞTERİ RENGİ VE LOGOSU (10 Ekim, v1.636.0).
// Kullanıcı (sipariş listesi ekran görüntüsüyle, bütün müşteri etiketleri aynı mavi): "müşterileri renklendirelim, gerekirse
// logo da ekleyelim". Kurulum: Müşteri B (#A33A3A, logolu), Tedarikçi A (renk seçilmemiş), iki sipariş.
// Ölçülen: listede etiketler carinin renginde; renksiz cari otomatik (paletten, sabit) renk alıyor ve öbürüyle aynı değil;
// logolu carinin etiketinde logo var; cari kartı Bilgiler sekmesinde renk seçilince kayda yazılıyor ve listede o renk çıkıyor;
// "Otomatik" seçilen rengi kaldırıyor.
const { uygulamaAc, modulAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir(ekran) {
  const t = { ...TOHUM };
  const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c2" ? { ...c, renk: "#A33A3A", resim: logo } : c)));
  const k = (id) => ({ id, urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 1, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([
    { id: "r1", siparisNo: "SAT-R1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-10", kalemler: [k("k1")] },
    { id: "r2", siparisNo: "SAT-R2", tip: "Satış", cariId: "c1", durum: "Bekliyor", tarih: "2026-10-10", kalemler: [k("k2")] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const etiketler = () => sayfa.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-siparis-cari-etiket]")].filter((x) => x.getBoundingClientRect().width > 0)
    .map((x) => [x.getAttribute("data-siparis-cari-etiket"), { renk: x.getAttribute("data-cari-renk"), arkaPlan: getComputedStyle(x).backgroundColor, logo: !!x.querySelector("[data-siparis-cari-logo]") }])));
  const tumu = async () => { await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); }); await sayfa.waitForTimeout(400); };
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(500); await tumu();
  const once = await etiketler();
  if (ekran) await sayfa.screenshot({ path: ekran, clip: { x: 0, y: 250, width: 900, height: 260 } });
  const sonuc = {
    musteriB: once["Müşteri B"],
    tedarikciOtomatik: once["Tedarikçi A"] && { paletten: /^#[0-9A-F]{6}$/i.test(once["Tedarikçi A"].renk), logoYok: !once["Tedarikçi A"].logo, farkli: once["Tedarikçi A"].renk !== once["Müşteri B"].renk },
  };
  // Cari kartında renk seç (Tedarikçi A).
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("span, div")].find((x) => x.children.length === 0 && x.textContent.trim() === "Tedarikçi A" && x.getBoundingClientRect().width > 0); if (e) e.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Bilgiler/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  sonuc.seciciVar = await sayfa.locator("[data-cari-renk-sec]:visible").count() > 0;
  await sayfa.locator("[data-cari-renk-sec]:visible").first().fill("#2f7d5b"); await sayfa.waitForTimeout(600);
  sonuc.kayit = (((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1") || {}).renk;
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(500); await tumu();
  sonuc.secilenListede = ((await etiketler())["Tedarikçi A"] || {}).renk;
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-cari-renk-otomatik]:visible").first().click(); await sayfa.waitForTimeout(500);
  sonuc.otomatigeDondu = !(((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1") || {}).renk;
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir(process.env.EKRAN).then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
