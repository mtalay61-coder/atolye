// SENARYO — E-FATURA ALTYAPISI (27 Eylül, v1.500.0 — Aşama 2; hiçbir yere bağlanmaz).
//
// Kullanıcı: "E-fatura altyapısı hazır olsun. Sonra bağlanacağız." Kurulum: firma bilgileri ve e-fatura
// serisi (ATL) tam; KDV'li iki satış fişi: SF-0001 Müşteri B'ye (vergi bilgileri tam, e-fatura mükellefi),
// SF-0002 Tedarikçi A'ya (vergi bilgisi yok).
// Ölçülenler:
//   1. Fişler > SF-0001 > İşlemler > "Fatura taslağı": önizleme (başlık, satırlar, oran bazında KDV, ödenecek,
//      yazıyla), eksik yok, XML düğmesi açık, gönder düğmesi kapalı.
//   2. Taslağı kaydet → `fatura:data`da kayıt (ETTN, senaryo, durum); listede "Fatura taslağı" rozeti.
//   3. XML indir → UBL-TR: numara, ETTN (kayıttaki), satır sayısı, ödenecek.
//   4. SF-0002: eksikler kırmızı (alıcı vergi no, adres, mükellefiyet), XML düğmesi kapalı.
//   5. Tanımlar > Firma > E-Fatura: seri büyük harfe çevrilip 3 karaktere kırpılıyor, kaydediliyor.
const fs = require("fs");
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const BUGUN = new Date().toISOString().slice(0, 10);
const YIL = BUGUN.slice(0, 4);

function tohum() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), unvan: "Test Atölye Ltd. Şti.", vergiNo: "3230512384", vergiDairesi: "Kadıköy",
    adres: "Atölye Sk. 1", il: "İstanbul", ilce: "Kadıköy", telefon: "0216 000 00 00", email: "info@atolye.test",
    kdvAktif: true, kdvMamul: 10, kdvDiger: 20, efaturaSeri: "ATL", earsivSeri: "ARS" };
  t["tanimlar:data"] = JSON.stringify(tan);
  const h = (id, fisNo, urunAd, renk, beden, birim, miktar, fiyat, oran) => ({
    id, fisNo, tarih: BUGUN, zaman: `${BUGUN}T09:00:00.000Z`, yon: "Borç", urunAd, renk, beden, birim, miktar, birimFiyat: fiyat,
    matrah: miktar * fiyat, kdvOrani: oran, kdvTutari: Math.round(miktar * fiyat * oran) / 100, tutar: miktar * fiyat * (1 + oran / 100),
    paraBirimi: "TRY", odemeSekli: "Nakit", vade: "", defter: "Genel", aciklama: "",
  });
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => {
    if (c.id === "c2") return { ...c, vergiNo: "1234567890", vergiDairesi: "Beşiktaş", adres: "Çarşı Cd. 5", il: "İstanbul", ilce: "Beşiktaş",
      efaturaMukellef: "evet", hareketler: [h("f1", "SF-0001", "Bot", "Siyah", "40", "çift", 2, 100, 10), h("f2", "SF-0001", "Deri", "Siyah", "", "desi", 3, 50, 20)] };
    if (c.id === "c1") return { ...c, hareketler: [h("f3", "SF-0002", "Bot", "Siyah", "41", "çift", 1, 100, 10)] };
    return c;
  }));
  return t;
}

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1200, height: 950 });
  await sayfa.waitForTimeout(2500);

  const faturaAc = async (fisNo) => {
    await modulAc(sayfa, "Fişler");
    await sayfa.waitForTimeout(800);
    const acikMi = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-islemler]")].some((x) => x.offsetParent));
    await sayfa.getByText(fisNo, { exact: true }).filter({ visible: true }).first().click();
    await sayfa.waitForTimeout(600);
    if (!(await acikMi())) { await sayfa.getByText(fisNo, { exact: true }).filter({ visible: true }).first().click(); await sayfa.waitForTimeout(600); }
    const menuAcik = await sayfa.evaluate(() => [...document.querySelectorAll('[data-fis-islem-menusu="acik"]')].some((x) => x.offsetParent));
    if (!menuAcik) { await sayfa.locator("[data-fis-islemler]:visible").first().click(); await sayfa.waitForTimeout(300); }
    await sayfa.locator(`[data-fis-fatura="${fisNo}"]:visible`).first().click();
    await sayfa.waitForTimeout(700);
  };
  const pencere = () => sayfa.evaluate((yil) => {
    const p = document.querySelector("[data-fatura-penceresi]");
    if (!p) return null;
    const m = (s) => { const e = p.querySelector(s); return e ? e.innerText.replace(/\s+/g, " ").trim() : null; };
    return {
      baslik: m("[data-fatura-baslik]"), no: (m("[data-fatura-no]") || "").replace(yil, "YYYY"), durum: m("[data-fatura-durum]"),
      eksikler: p.querySelector("[data-fatura-eksikler]").getAttribute("data-fatura-eksikler"),
      engeller: [...p.querySelectorAll("[data-fatura-engel]")].map((e) => e.getAttribute("data-fatura-engel")),
      satirlar: [...p.querySelectorAll("[data-fatura-satir]")].map((r) => [...r.children].map((c) => c.innerText.trim()).join(" | ")),
      kdv: [...p.querySelectorAll("[data-fatura-kdv-orani]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()),
      odenecek: m("[data-fatura-odenecek]"), yaziyla: m("[data-fatura-yaziyla]"),
      alici: m('[data-fatura-taraf="alici"]'),
      xmlAcik: !p.querySelector("[data-fatura-xml]").disabled, gonderAcik: !p.querySelector("[data-fatura-gonder]").disabled,
    };
  }, YIL);

  // 1-3. SF-0001
  await faturaAc("SF-0001");
  const tam = await pencere();
  if (process.env.FOTO) await sayfa.locator("[data-fatura-penceresi] > div").first().screenshot({ path: process.env.FOTO });
  await sayfa.locator("[data-fatura-not]").fill("Teşekkür ederiz");
  await sayfa.locator("[data-fatura-kaydet]").click();
  await sayfa.waitForTimeout(600);
  const kayitlar = (await depoOku(sayfa, "fatura:data")) || [];
  const k = kayitlar[0] || {};
  const kayit = { adet: kayitlar.length, fisNo: k.fisNo, durum: k.durum, senaryo: k.senaryo, not: k.not, ettnVar: /^[0-9A-F-]{36}$/.test(k.ettn || ""), faturaNo: k.faturaNo || null };
  const sonrasi = await pencere();
  const [indirme] = await Promise.all([sayfa.waitForEvent("download"), sayfa.locator("[data-fatura-xml]").click()]);
  const xml = fs.readFileSync(await indirme.path(), "utf8");
  const xmlOlcum = {
    dosya: indirme.suggestedFilename(),
    numara: (xml.match(/<cbc:ID>([A-Z0-9]{16})<\/cbc:ID>/) || [])[1].replace(YIL, "YYYY"),
    ettnKayittaki: xml.includes(`<cbc:UUID>${k.ettn}</cbc:UUID>`),
    satir: (xml.match(/<cac:InvoiceLine>/g) || []).length,
    odenecek: (xml.match(/<cbc:PayableAmount currencyID="TRY">([\d.]+)<\/cbc:PayableAmount>/) || [])[1],
    not: xml.includes("<cbc:Note>Teşekkür ederiz</cbc:Note>"),
  };
  await sayfa.getByRole("button", { name: /Kapat/ }).filter({ visible: true }).last().click();
  await sayfa.waitForTimeout(400);
  const rozet = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-fatura-rozet]")].map((e) => e.getAttribute("data-fis-fatura-rozet") + ":" + e.innerText.trim()));

  // 4. SF-0002 (eksik)
  await faturaAc("SF-0002");
  const eksik = await pencere();
  await sayfa.getByRole("button", { name: /Kapat/ }).filter({ visible: true }).last().click();
  await sayfa.waitForTimeout(300);

  // 5. Tanımlar > Firma > E-Fatura
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-tanim-sekme="firma"]').first().click();
  await sayfa.waitForTimeout(400);
  const seri = sayfa.locator('[data-efatura-alan="efaturaSeri"]').first();
  await seri.fill("ab1x");
  await sayfa.waitForTimeout(400);
  const fb = (((await depoOku(sayfa, "tanimlar:data")) || {}).firmaBilgileri) || {};
  const ayar = { kutu: await seri.inputValue(), kayit: fb.efaturaSeri, baglanti: await sayfa.locator("[data-efatura-baglanti]").first().innerText() };

  await tarayici.close();
  return { hatalar, tam, kayit, sonrasi: { durum: (sonrasi.durum || "").replace(/·.*$/, "").trim() }, xml: xmlOlcum, rozet, eksik, ayar };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
