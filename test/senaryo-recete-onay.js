// SENARYO — REÇETE ONAYI OLMADAN ÜRETİM AÇILMAZ (10 Ekim, v1.634.0).
// Kullanıcı: "mamul stok için reçete tam bitmeden üretim oluşturulamasın, reçete onay olsun, reçete onaysız üretim
// başlamasın". Kapı AÇIK (`receteOnayKapisi: true`). Kurulum: Bot (u2, tohum) reçetesi EKSİK (Taba/Kahve rengi yok);
// Çizme (u9) reçetesi TAM ama onaysız. SAT-R1: Bot Siyah 40.
// Ölçülen:
//   1) Üretim > Yeni: Bot seçilince kapı uyarısı ("tamamlanmadan") + Oluştur pasif; Çizme seçilince "onaylanmadan".
//   2) Bot ürün kartı > Reçete: durum "eksik", eksikler listesi, Onayla pasif.
//   3) Çizme kartı > Reçete: "onaysiz" → Onayla → "onayli"; depoda receteOnay (onaylayan/imza) yazıldı.
//   4) Üretim > Yeni > Çizme: uyarı yok, Siyah 40:2 → Oluştur → üretim açıldı.
//   5) Tedarik Planlama (SAT-R1 Bot) → Üretime gönder → üretim AÇILMADI, uyarı; seçim korundu.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({
    id: "u9", ad: "Çizme", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", birimFiyat: 500, hareketler: [],
    variants: [{ renk: "Siyah", beden: "40", miktar: 0 }, { renk: "Siyah", beden: "41", miktar: 0 }],
    recete: [{ id: "rc1", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "",
      mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 3, birim: "metre" }],
  });
  t["stok:items"] = JSON.stringify(stok);
  const satis = JSON.parse(TOHUM["siparis:data"] || "[]");
  t["siparis:data"] = JSON.stringify([{
    id: "sr1", siparisNo: "SAT-R1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-10", teslimTarihi: "", not: "",
    kalemler: [{ id: "r40", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" }],
  }, ...satis]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, receteOnayKapisi: true });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonuc = {};
  const gorunurMetin = (sec) => sayfa.evaluate((sec) => { const e = [...document.querySelectorAll(sec)].find((x) => x.getBoundingClientRect().width > 0); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; }, sec);
  const toast = () => sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); return t ? t.textContent.replace(/\s+/g, " ").trim() : null; });
  const uretimSayisi = async () => (await depoOku(sayfa, "uretim:siparisler") || []).length;
  const ilkUretim = await uretimSayisi();

  // 1) Üretim formu.
  await modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-yeni-uretim]:visible").first().click(); await sayfa.waitForTimeout(400);
  const urunSec = async (id) => { await sayfa.locator('select:visible').filter({ has: sayfa.locator('option[value="u9"]') }).first().selectOption(id); await sayfa.waitForTimeout(400); };
  const formDurumu = async () => ({
    uyari: await gorunurMetin("[data-uretim-recete-kapisi]"),
    olusturPasif: await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-uretim-olustur]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.disabled : null; }),
  });
  await urunSec("u2"); sonuc.formBot = await formDurumu();
  await urunSec("u9"); sonuc.formCizmeOnaysiz = await formDurumu();
  if (process.env.EKRAN_FORM) await sayfa.screenshot({ path: process.env.EKRAN_FORM, clip: { x: 0, y: 60, width: 1400, height: 420 } });

  // 2-3) Ürün kartları.
  const kartAc = async (ad) => {
    await modulAc(sayfa, "Mamul Stok"); await sayfa.waitForTimeout(600);
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
    await sayfa.locator('button:has-text("Reçete"):visible').first().click(); await sayfa.waitForTimeout(700);
  };
  const onayPaneli = () => sayfa.evaluate(() => {
    const p = [...document.querySelectorAll("[data-recete-onay]")].find((x) => x.getBoundingClientRect().width > 0);
    if (!p) return null;
    const b = p.querySelector("[data-recete-onayla]");
    return { durum: p.getAttribute("data-recete-onay"), onaylaPasif: b ? b.disabled : null,
      eksikSayisi: p.querySelectorAll("[data-recete-eksikleri] li").length, ilkEksik: (p.querySelector("[data-recete-eksikleri] li") || {}).textContent || null };
  });
  const panelResmi = async (yol) => { if (!yol) return; const p = sayfa.locator("[data-recete-onay]:visible").first(); await p.scrollIntoViewIfNeeded(); await p.screenshot({ path: yol }); };
  await kartAc("Bot"); sonuc.botKarti = await onayPaneli(); await panelResmi(process.env.EKRAN_EKSIK);
  await sayfa.keyboard.press("Escape");
  await kartAc("Çizme"); sonuc.cizmeOnce = await onayPaneli(); await panelResmi(process.env.EKRAN_ONAYSIZ);
  await sayfa.locator("[data-recete-onayla]:visible").first().click(); await sayfa.waitForTimeout(600);
  sonuc.cizmeSonra = await onayPaneli(); await panelResmi(process.env.EKRAN_ONAYLI);
  const kayit = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "u9") || {};
  sonuc.depodaOnay = { var: !!(kayit.receteOnay && kayit.receteOnay.imza), tarihVar: !!(kayit.receteOnay && kayit.receteOnay.tarih) };

  // 4) Onaylı ürünle üretim.
  await modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(500);
  if (!(await sayfa.locator("[data-uretim-olustur]:visible").count())) { await sayfa.locator("[data-yeni-uretim]:visible").first().click(); await sayfa.waitForTimeout(400); }
  await urunSec("u9");
  sonuc.formCizmeOnayli = await formDurumu();
  await sayfa.locator('button:has-text("Siyah"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('input[type="number"]:visible').first().fill("2");
  await sayfa.locator("[data-uretim-olustur]:visible").first().click(); await sayfa.waitForTimeout(700);
  sonuc.onayliUretimAcildi = (await uretimSayisi()) - ilkUretim;

  // 5) Tedarik planlama — Bot (eksik reçete).
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-durum-cip="Tümü"]:visible').first().click(); await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-siparis-tam-ekran="SAT-R1"]').first().click(); await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-kart-bolum="planlama"]:visible').first().click(); await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-planlama-satir-sec="Bot|Siyah"]:visible').first().check();
  await sayfa.locator("[data-planlama-toplu-uretim]:visible").first().click(); await sayfa.waitForTimeout(500);
  sonuc.planlama = {
    uyari: await toast(),
    acilanUretim: (await uretimSayisi()) - ilkUretim - sonuc.onayliUretimAcildi,
    secimKorundu: await sayfa.locator('[data-planlama-satir-sec="Bot|Siyah"]:visible').first().isChecked(),
  };

  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
