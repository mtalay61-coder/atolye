// SENARYO — FİŞTE KDV (27 Eylül, v1.496.0 — e-fatura yol haritası, Aşama 1).
//
// Kullanıcı: "KDV hariç fatura kesiyoruz, tevkifat olmuyor, döviz faturası arada kesiyoruz yurt içine."
// Karar: yeni fişlerde cariye KDV DAHİL tutar; alışta da KDV; açma anahtarı Tanımlar'da (varsayılan kapalı).
//
// Kurulum: KDV açık, varsayılan mamul %10, diğer %20. Satış fişi (Müşteri B): Bot 40 × 2 @ 100 (mamul →
// %10), Deri Siyah × 3 @ 50 (hammadde → kutuda %20 önerilir) satır EKLENİRKEN %0 seçilerek (v1.501.0 —
// kullanıcı: "KDV satır eklerken girilsin, eklendikten sonra değil"; altın bu yüzden değişti).
// Ölçülenler:
//   1. Giriş satırındaki KDV kutusu ürünün oranıyla gelir (Bot 10, Deri 20); eklenen satırda oran yalnız yazı.
//   2. Dip döküm: matrah 350, KDV %0 = 0, %10 = 20, toplam 370; Ekle'den sonra yeni ürün kendi oranıyla gelir.
//   3. Kaydedince cari hareketleri: tutar KDV dahil, matrah / oran / KDV ayrı; birim fiyat KDV hariç.
//   4. KDV KAPALI iken (ayrı açılış) aynı fiş eskisi gibi: KDV sütunu yok, cariye 350.
//   5. Tanımlar > Firma'dan KDV açılıyor (varsayılan kapalı); cari kartında vergi dairesi / TCKN / il / ilçe
//      yazılıp kaydediliyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function fisKes(kdvAcik, hatalar) {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), kdvAktif: kdvAcik, kdvMamul: 10, kdvDiger: 20 };
  t["tanimlar:data"] = JSON.stringify(tan);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Müşteri B" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-cari-fis-ac="Satış"]').first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("SF-KDV");
  // KDV SATIR EKLENİRKEN (v1.501.0): ürün seçilince giriş satırındaki KDV kutusu ürünün oranını gösterir;
  // `kdv` verilirse Ekle'den önce o seçilir. `varsayilanlar`: ürün seçildiğinde kutuda görünen oran.
  const varsayilanlar = {};
  const ekle = async (ad, renk, olcu, miktar, fiyat, kdv) => {
    const et = await sayfa.evaluate((a) => { const dl = document.getElementById("fis-urun-listesi"); const o = dl ? [...dl.options].find((x) => x.value.startsWith(a)) : null; return o ? o.value : a; }, ad);
    await sayfa.locator("[data-urun-arama]").first().fill(et);
    await sayfa.waitForTimeout(400);
    if (renk) { const r = sayfa.locator("[data-renk-arama]:visible"); if (await r.count()) { await r.first().fill(renk); await sayfa.waitForTimeout(250); } }
    await sayfa.locator(`[data-kalem-miktar="${olcu}"]:visible`).first().fill(miktar);
    await sayfa.locator("[data-kalem-fiyat]:visible").first().fill(fiyat);
    const kutu = sayfa.locator("[data-kalem-kdv]:visible");
    varsayilanlar[ad] = (await kutu.count()) ? await kutu.first().inputValue() : null;
    if (kdv != null && (await kutu.count())) await kutu.first().selectOption(String(kdv));
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(400);
  };
  await ekle("Bot", "Siyah", "40", "2", "100");
  await ekle("Deri", "Siyah", "tek", "3", "50", kdvAcik ? 0 : null);
  const dip = () => sayfa.evaluate(() => {
    const m = document.querySelector("[data-fis-kdv-dokumu]");
    return {
      kdvSutunu: !!document.querySelector("[data-fis-kdv-sutunu]"),
      // Eklenmiş satırda oran YALNIZ YAZI (seçici yok — "eklendikten sonra değil").
      satirOranlari: [...document.querySelectorAll("[data-fis-satir-kdv]")].map((s) => `${s.tagName === "SELECT" ? "seçici" : "yazı"} ${s.innerText.trim()}`),
      dokum: m ? m.innerText.replace(/\s+/g, " ").trim() : null,
    };
  });
  const ilk = await dip();
  // Ekle'den sonra giriş satırı sıfırlanır: yeni ürün kendi oranıyla gelir (önceki seçim taşınmaz).
  const sonrakiUrun = kdvAcik ? await (async () => {
    const et = await sayfa.evaluate(() => { const dl = document.getElementById("fis-urun-listesi"); const o = dl ? [...dl.options].find((x) => x.value.startsWith("Deri")) : null; return o ? o.value : "Deri"; });
    await sayfa.locator("[data-urun-arama]").first().fill(et);
    await sayfa.waitForTimeout(400);
    return sayfa.locator("[data-kalem-kdv]:visible").first().inputValue();
  })() : null;
  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);
  const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const hareketler = (cari.hareketler || []).filter((h) => h.fisNo === "SF-KDV")
    .map((h) => `${h.urunAd} ${h.miktar} × ${h.birimFiyat} → tutar ${h.tutar}` + (h.kdvTutari != null ? ` (matrah ${h.matrah}, %${h.kdvOrani}, KDV ${h.kdvTutari})` : ""));
  await tarayici.close();
  return { varsayilanlar, ilk, sonrakiUrun, hareketler };
}

async function ayarlar(hatalar) {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-tanim-sekme="firma"]').first().click();
  await sayfa.waitForTimeout(400);
  const once = await sayfa.evaluate(() => { const c = document.querySelector("[data-kdv-aktif]"); return c ? c.checked : null; });
  await sayfa.locator("[data-kdv-aktif]").first().click();
  await sayfa.locator('[data-kdv-varsayilan="kdvMamul"]').first().selectOption("10");
  await sayfa.waitForTimeout(500);
  const fb = (((await depoOku(sayfa, "tanimlar:data")) || {}).firmaBilgileri) || {};

  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  // Alanlar düzenleme modunda (kart başlığındaki kalem).
  // Müşteri B kartının KENDİ kalemi: başlıktan yukarı çıkıp düzenle düğmesini taşıyan ilk kapsayıcı.
  // Listede her kartın kendi kalemi var: kapsayıcısında "Müşteri B" geçen, diğer carilerin geçmediği düğme.
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll('[data-kart-eylem="duzenle"]')].filter((b) => b.getBoundingClientRect().width > 0).find((b) => {
      let p = b; for (let i = 0; i < 10 && p; i++, p = p.parentElement) {
        const t = p.textContent || "";
        if (t.includes("Müşteri B")) return !t.includes("Personel C") && !t.includes("Tedarikçi A");
      }
      return false;
    });
    if (d) d.click();
  });
  await sayfa.waitForTimeout(400);
  for (const [alan, deger] of [["vergiDairesi", "Kadıköy"], ["tckn", "11111111110"], ["il", "İstanbul"], ["ilce", "Kadıköy"]]) {
    const k = sayfa.locator(`[data-cari-vergi-alani="${alan}"]:visible`).first();
    await k.fill(deger); await k.blur(); await sayfa.waitForTimeout(250);
  }
  const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  await tarayici.close();
  return { kdvKutusuBaslangicta: once, kayit: { kdvAktif: fb.kdvAktif, kdvMamul: fb.kdvMamul }, cari: { vergiDairesi: cari.vergiDairesi, tckn: cari.tckn, il: cari.il, ilce: cari.ilce } };
}

async function calistir() {
  const hatalar = [];
  const acik = await fisKes(true, hatalar);
  const kapali = await fisKes(false, hatalar);
  const ayar = await ayarlar(hatalar);
  return { hatalar, acik, kapali, ayar };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
