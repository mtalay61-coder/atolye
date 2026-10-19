// SENARYO — UÇTAN UCA (v1.710 — kullanıcı: "Uygulamayı baştan aşağı kontrol et. Sanal stok aç, renk beden, sipariş
// oluştur, üretim oluştur, carileri kontrol et").
// Kurulum (sanal stok): Deri Siyah 100 m; Taban Siyah 40/41 (50'şer); Bot (mamul) Siyah 40/41, reçete Kesim: Deri
// 2 m/çift, Kalfa: Taban beden beden 1; prosesler Kesim → Kampre (ara, Kampreci) → Saya → Kalfa; işçilik Kesim 10,
// Saya 20, Kalfa 15, Kampre 3. Cariler: Müşteri B, Kesimci (personel), Sayacı (Fasoncu), Kalfacı (personel), Kampreci.
// Akış: SAT-E2E (40:3, 41:2) → Planlama "Seçilenleri üret" → üretim kartında sırayla İşi Ver + Teslim Al; her adımda
// sırası gelmeyen prosese iş verilemediği ölçülür. Sonda stok, cari bakiyeleri, fişsiz hareket, adım denetimi.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }, { id: "p2", ad: "Saya", sira: 2 }, { id: "p3", ad: "Kalfa", sira: 3 }];
  tan.araProsesler = [{ id: "ap1", ad: "Kampre", cariId: "c6", ucret: 3 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const v = (renk, beden, miktar) => ({ renk, beden, miktar });
  const r = (proses, hid, had, renk, beden, mamulBeden, miktar, birim) =>
    ({ proses, hammaddeUrunId: hid, hammaddeAd: had, renk, beden, mamulRenk: "Siyah", mamulBeden, miktar, birim });
  t["stok:items"] = JSON.stringify([
    { id: "u1", kategori: "Hammadde", ad: "Deri", birim: "metre", alisFiyati: 50, variants: [v("Siyah", "", 100)], recete: [], hareketler: [] },
    { id: "u5", kategori: "Hammadde", ad: "Taban", birim: "çift", alisFiyati: 20, variants: [v("Siyah", "40", 50), v("Siyah", "41", 50)], recete: [], hareketler: [] },
    { id: "u2", ad: "Bot", birim: "çift", kategori: "Mamul", variants: [v("Siyah", "40", 0), v("Siyah", "41", 0)], hareketler: [],
      recete: [r("Kesim", "u1", "Deri", "Siyah", "", "Tüm Bedenler", 2, "metre"), r("Kalfa", "u5", "Taban", "Siyah", "40", "40", 1, "çift"), r("Kalfa", "u5", "Taban", "Siyah", "41", "41", 1, "çift")],
      receteEkProsesler: ["Saya"], prosesUcretleri: { Kesim: 10, Saya: 20, Kalfa: 15 }, araProsesEklentileri: { Kesim: ["ap1"] } },
  ]);
  t["cari:data"] = JSON.stringify([
    { id: "c2", unvan: "Müşteri B", tip: "Müşteri", hareketler: [] },
    { id: "c3", unvan: "Kesimci", tip: "Personel", bagliProsesler: ["Kesim"], hareketler: [] },
    { id: "c4", unvan: "Sayacı", tip: "Personel", altTip: "Fasoncu", bagliProsesler: ["Saya"], hareketler: [] },
    { id: "c5", unvan: "Kalfacı", tip: "Personel", bagliProsesler: ["Kalfa"], hareketler: [] },
    { id: "c6", unvan: "Kampreci", tip: "Personel", altTip: "Fasoncu", hareketler: [] },
  ]);
  const k = (id, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk: "Siyah", beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 200, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "se", siparisNo: "SAT-E2E", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-19", teslimTarihi: "", not: "",
    kalemler: [k("k40", "40", 3), k("k41", "41", 2)] }]);
  t["uretim:siparisler"] = "[]";

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.setViewportSize({ width: 1300, height: 1000 });
  await sayfa.waitForTimeout(2500);
  const adimlar = [];

  // 1) Planlama → satırları seç → üret
  await sayfa.getByRole("button", { name: "Planlama", exact: true }).first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => [...document.querySelectorAll("[data-planlama-satir]")].filter((e) => e.getBoundingClientRect().width > 0).forEach((e) => e.click()));
  await sayfa.evaluate(() => [...document.querySelectorAll("[data-toplu-uret]")].find((e) => e.getBoundingClientRect().width > 0).click());
  await sayfa.waitForTimeout(1500);
  let u = ((await depoOku(sayfa, "uretim:siparisler")) || [])[0];
  adimlar.push({ ad: "üretim açıldı", adimlar: u ? u.prosesIlerleme.map((p) => p.proses + (p.araProsesMi ? "(ara)" : "")) : "YOK", adet: u && u.adet });
  if (!u) { await tarayici.close(); return { hatalar, adimlar }; }

  // 2) Üretim kartını aç
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(800);
  await sayfa.getByText(String(u.siparisNo), { exact: true }).last().click();
  await sayfa.waitForTimeout(900);

  const isVerFormlari = () => sayfa.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /İşi Ver/.test(b.innerText) && b.getBoundingClientRect().width > 0).length);
  const isVer = async (kisi) => sayfa.evaluate((kisi) => {
    const sel = [...document.querySelectorAll("select")].find((s) => s.getBoundingClientRect().width > 0 && [...s.options].some((o) => o.text === "⚠ Personel seçin"));
    if (!sel) return "kime yok";
    const o = [...sel.options].find((x) => x.text === kisi);
    if (!o) return "kişi listede yok: " + [...sel.options].map((x) => x.text).join(",");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(sel, o.value);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  }, kisi);
  const verButon = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((b) => /İşi Ver/.test(b.innerText) && b.getBoundingClientRect().width > 0); if (b) b.click(); return !!b; });
  const teslim = async () => { const b = sayfa.locator("[data-teslim-al]:visible").first(); if (!(await b.count())) return false; await b.click(); await sayfa.waitForTimeout(1500); return true; };

  for (const [proses, kisi] of [["Kesim", "Kesimci"], ["Saya", "Sayacı"], ["Kalfa", "Kalfacı"]]) {
    const formSayisi = await isVerFormlari();   // sırası gelmeyen proseste form OLMAMALI: her an yalnız 1
    const sec = await isVer(kisi);
    await sayfa.waitForTimeout(200);
    const verildi = await verButon();
    await sayfa.waitForTimeout(1500);
    const tes = await teslim();
    u = ((await depoOku(sayfa, "uretim:siparisler")) || [])[0];
    adimlar.push({ ad: proses, acikIsVerFormu: formSayisi, kime: sec, verildi, teslimAlindi: tes,
      durum: u.prosesIlerleme.map((p) => `${p.proses}:${p.tamamlandiMi ? "✓" : (p.atamalar || []).length ? "verildi" : "-"}`).join(" ") });
  }

  // 3) SATIŞ: Alış / Satış › Müşteri B › siparişten ekle → kaydet (siparişin karşılananı, müşteri borcu, stok çıkışı)
  await modulAc(sayfa, "Alış / Satış");
  await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator("[alis-satis-cari]").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300);
  await kutu.press("Enter"); await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-alis-satis-ac]").click();
  await sayfa.waitForTimeout(900);
  const satisEklendi = await sayfa.evaluate(() => { const b = document.querySelector('[data-siparisten-ekle="SAT-E2E"]'); if (b) b.click(); return !!b; });
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-alis-satis-panel] [data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);
  adimlar.push({ ad: "satış fişi", siparistenEklendi: satisEklendi });

  // 4) Ölçümler
  const stok = (await depoOku(sayfa, "stok:items")) || [];
  const mik = (id, renk, beden) => ( ((stok.find((p) => p.id === id) || {}).variants || []).filter((x) => x.renk === renk && (beden == null || x.beden === beden)).reduce((s, x) => s + (x.miktar || 0), 0));
  const cariler = (await depoOku(sayfa, "cari:data")) || [];
  const cariOzet = cariler.map((c) => `${c.unvan}: ${(c.hareketler || []).map((h) => `${h.yon} ${h.tutar} [${h.fisNo ? h.fisNo.replace(/^\d+/, "N") : "FİŞSİZ"}]`).join(", ") || "—"}`);
  const fissiz = cariler.flatMap((c) => (c.hareketler || []).filter((h) => !h.fisNo)).length
    + stok.flatMap((p) => (p.hareketler || []).filter((h) => !h.fisNo)).length;
  const ihlal = require("./erp.cjs").adimSirasiIhlalleri([u]).length;
  const tanS = (await depoOku(sayfa, "tanimlar:data")) || {};
  const kz = require("./erp.cjs").karZararHesapla({ stok, cariler, muhasebe: {}, giderKartlari: [], donem: "tumu", defter: "Tümü", uretim: [u], tanimlar: tanS });
  const kzOzet = { satisGeliri: kz.satisGeliri, smm: Math.round(kz.smm * 100) / 100, uretimIscilik: kz.uretimIscilik, brutKar: Math.round(kz.brutKar * 100) / 100, giderToplam: kz.giderToplam, netKar: Math.round(kz.netKar * 100) / 100, gruplar: JSON.stringify(kz.gruplar) };
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "se") || {};
  await tarayici.close();
  return {
    hatalar, adimlar,
    sonUretim: { asama: u.asama, stogaEklendi: !!u.stogaEklendiMi },
    stok: { "Bot 40": mik("u2", "Siyah", "40"), "Bot 41": mik("u2", "Siyah", "41"), Deri: mik("u1", "Siyah"), "Taban 40": mik("u5", "Siyah", "40"), "Taban 41": mik("u5", "Siyah", "41") },
    gelirGider: kzOzet, cariler: cariOzet, fissizHareket: fissiz, ihlal,
    siparisKalemleri: (sip.kalemler || []).map((x) => `${x.beden}: ${x.miktar} · karşılanan ${x.karsilanan || 0} · ${x.planlama ? "planlı" : "-"}`), siparisDurum: sip.durum,
  };
}
if (require.main === module) calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
module.exports = { calistir };
