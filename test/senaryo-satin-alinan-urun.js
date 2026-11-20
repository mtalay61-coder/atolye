// SENARYO — SATIN ALINAN ÜRÜN: STOK KARTI, SİPARİŞ UYARISI, PLANLAMA (v1.744.29, kullanıcı 20 Kasım).
//
//   "Ürün stok kartında tedarikçi ekleyelim ve satın aldığımız ürünler için reçete olmasın."
//   Kararlar: ayrı işaret ("Satın alınan ürün (reçetesiz)") + tedarikçi; siparişte reçete uyarısı yok; stok kartında
//   Reçete / Maliyet / Kapasite gizli; planlamada satın almaya gider.
//
// Tohum: Bot (u2) işaretli, tedarikçisi Tedarikçi A, reçetesi önceden kalmış (4 satır). Kıyas: "Model R" (u3) reçetesiz,
// işaretsiz mamul. Bekleyen satış siparişi SAT-SA1: Bot Siyah 40 × 2, Model R Siyah 40 × 3.
// Ölçülen:
//   1. Bot kartı: sekmeler (Reçete / Maliyet yok), "Satın alınan ürün · reçetesiz" rozeti, tedarikçi yazısı. Model R kartında Reçete var.
//   2. Düzenleme: mamulde tedarikçi seçimi ve işaret kutusu var; işaret kaldırılıp kaydedilince Reçete sekmesi geri gelir,
//      kayıtta satinAlinan false; yeniden işaretlenip kaydedilince true (kalıcı).
//   3. Yeni satış siparişi: Bot seçilince reçete uyarısı YOK; Model R seçilince VAR.
//   4. Planlama: Bot satırında "Üret" düğmesi yok, Model R'de var; ikisi seçilip "Seçilenleri üret" → Bot Satınalma panelinde.
const { uygulamaAc, modulAc, cariSec, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]).map((u) => (u.id === "u2" ? { ...u, satinAlinan: true, tedarikciId: "c1", alisFiyati: 250 } : u));
  stok.push({ id: "u3", ad: "Model R", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], hareketler: [], recete: [] });
  t["stok:items"] = JSON.stringify(stok);
  const kalem = (id, urunId, urunAd, miktar) => ({ id, urunId, urunAd, renk: "Siyah", beden: "40", miktar, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "sa1", siparisNo: "SAT-SA1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-11-20", teslimTarihi: "", not: "",
    kalemler: [kalem("ka1", "u2", "Bot", 2), kalem("ka2", "u3", "Model R", 3)] }, ...JSON.parse(TOHUM["siparis:data"])]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  const modul = async (ad) => { await modulAc(sayfa, ad); await sayfa.waitForTimeout(700); };
  const listedenAc = async (ad) => {
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };
  const kartiKapat = async (ad) => {
    await sayfa.evaluate((b) => {
      const d = [...document.querySelectorAll("[data-serit-pencere]")].find((x) => x.getBoundingClientRect().height > 0 && x.textContent.trim() === b);
      const x = d && d.querySelector("button"); if (x) x.click();
    }, `Ürün: ${ad}`);
    await sayfa.waitForTimeout(600);
  };
  const kartBilgisi = () => sayfa.evaluate(() => {
    const gor = (x) => x.getBoundingClientRect().height > 0;
    const sekmeler = [...document.querySelectorAll("button")].filter(gor).map((b) => b.textContent.trim())
      .filter((s) => /^(Stok Bilgileri|Reçete|Maliyet|Kapasite|Fiyatlandırma|Siparişler)/.test(s)).map((s) => s.replace(/\s*\(.*$/, ""));
    const rozet = [...document.querySelectorAll("[data-urun-satin-alinan-rozet]")].some(gor);
    const ted = [...document.querySelectorAll("span")].find((s) => gor(s) && /^Tedarikçi: /.test(s.textContent.trim()));
    return { sekmeler, rozet, tedarikci: ted ? ted.textContent.trim() : null };
  });
  const urunKaydi = async (id) => ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === id);

  const sonuc = {};
  // 1. Kartlar
  await modul("Ürün Stok");
  await listedenAc("Bot");
  sonuc.botKarti = await kartBilgisi();
  // 2. Düzenleme: işaret kaldır → kaydet → Reçete geri; yeniden işaretle → kaydet
  await sayfa.locator('[data-kart-eylem="duzenle"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  sonuc.duzenleme = {
    tedarikciSecimi: await sayfa.evaluate(() => { const s = [...document.querySelectorAll("[data-urun-tedarikci]")].find((x) => x.getBoundingClientRect().height > 0); return s ? s.value : null; }),
    isaretVar: await sayfa.locator('[data-urun-satin-alinan]:visible').count(),
    isaretli: await sayfa.locator('[data-urun-satin-alinan]:visible').first().isChecked(),
  };
  await sayfa.locator('[data-urun-satin-alinan]:visible').first().uncheck();
  await sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click();
  await sayfa.waitForTimeout(900);
  sonuc.isaretKaldirilinca = { kart: await kartBilgisi(), kayit: (await urunKaydi("u2")).satinAlinan };
  await sayfa.locator('[data-kart-eylem="duzenle"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-urun-satin-alinan]:visible').first().check();
  await sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click();
  await sayfa.waitForTimeout(900);
  sonuc.yenidenIsaretlenince = { kart: await kartBilgisi(), kayit: (await urunKaydi("u2")).satinAlinan, tedarikci: (await urunKaydi("u2")).tedarikciId };
  await kartiKapat("Bot");
  await listedenAc("Model R");
  sonuc.modelRKarti = await kartBilgisi();
  await kartiKapat("Model R");

  // 3. Yeni satış siparişinde reçete uyarısı
  const uyariVarMi = () => sayfa.evaluate(() => /için hiç reçete tanımlı değil|reçete eşleştirmesi yok/.test(document.body.innerText));
  const urunRenkSec = async (urun) => {
    const k = sayfa.locator('input[placeholder="Model ara…"]:visible').first();
    await k.click(); await k.fill(urun); await sayfa.waitForTimeout(400);
    // Açılan listedeki seçenek: arama kutusunun HEMEN ALTINDA, adı birebir tutan görünür öğe (sayfada aynı ad başka yerde de geçer)
    await sayfa.evaluate((urun) => {
      const kutu = [...document.querySelectorAll('input[placeholder="Model ara…"]')].find((x) => x.getBoundingClientRect().height > 0);
      const alt = kutu.getBoundingClientRect().bottom;
      const aday = [...document.querySelectorAll("span, div, button, li")].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.height > 0 && r.top >= alt - 2 && r.top < alt + 300 && e.textContent.trim() === urun && e.children.length === 0;
      }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (aday) { aday.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); aday.click(); }
    }, urun);
    await sayfa.waitForTimeout(500);
    const r = sayfa.locator("input[data-siparis-renk-arama]:visible").first();
    await r.click(); await r.fill("Siyah"); await sayfa.waitForTimeout(300);
    await sayfa.locator("text=Siyah").last().click().catch(() => {});
    await sayfa.waitForTimeout(600);
  };
  await modul("Sipariş");
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);
  await cariSec(sayfa, "Müşteri B"); await sayfa.waitForTimeout(300);
  await urunRenkSec("Bot");
  sonuc.siparisUyarisi = { bot: await uyariVarMi() };
  await urunRenkSec("Model R");
  sonuc.siparisUyarisi.modelR = await uyariVarMi();
  await sayfa.locator('button:has-text("Vazgeç"):visible').first().click().catch(() => {});
  await sayfa.waitForTimeout(500);

  // 4. Planlama
  await sayfa.getByRole("button", { name: "Planlama", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  sonuc.planlama = await sayfa.evaluate(() => {
    const satir = (ad) => { const c = [...document.querySelectorAll("[data-planlama-satir]")].find((e) => e.getBoundingClientRect().width > 0 && e.getAttribute("data-planlama-satir") === `SAT-SA1|${ad}|Siyah`); return c ? c.closest("tr") : null; };
    const uretDugmesi = (tr) => !!(tr && tr.querySelector('button[title="Sadece bu satırı Üret paneline gönder"]'));
    return { botUretDugmesi: uretDugmesi(satir("Bot")), modelRUretDugmesi: uretDugmesi(satir("Model R")) };
  });
  await sayfa.evaluate(() => {
    ["Bot", "Model R"].forEach((ad) => { const c = [...document.querySelectorAll("[data-planlama-satir]")].find((e) => e.getBoundingClientRect().width > 0 && e.getAttribute("data-planlama-satir") === `SAT-SA1|${ad}|Siyah`); if (c && !c.checked) c.click(); });
  });
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => [...document.querySelectorAll("[data-toplu-uret]")].find((e) => e.getBoundingClientRect().width > 0).click());
  await sayfa.waitForTimeout(1200);
  sonuc.planlama.topluUretSonrasi = await sayfa.evaluate(() => {
    const metin = (s) => { const e = document.querySelector(s); return e ? e.innerText : ""; };
    return { satinalmaPanelindeBot: /Bot/.test(metin("[data-satinalma-cerceve]")), uretPanelindeBot: /Bot/.test(metin("[data-uret-cerceve]")) };
  });
  sonuc.planlama.uretimAcilmadiBot = !(((await depoOku(sayfa, "uretim:siparisler")) || []).some((u) => u.urunId === "u2" && /SAT-SA1/.test(JSON.stringify(u))));

  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
