// SENARYO — GELİR / GİDER KARTLARI (kullanıcı, 17 Eylül: "kârlılığımızı kontrol edecek, giderleri
// listeleyecek veya alışsız giderleri kapatacağımız kartlar... girişin çıkış karşılığı olmak
// zorunda çünkü").
//
// ÖNCE: para hareketinin karşı tarafı yalnız CARİ olabiliyordu; kira/elektrik/maaş gibi alışı
// olmayan giderlerde karşı taraf yoktu, para "hiçbir yere" gidiyordu ve kârlılık hesaplanamıyordu.
//
// Ölçülen: (1) Tanımlar'da kart açılıyor, hazır kartlarla başlanabiliyor; (2) kasa formunda kart
// karşı taraf olarak seçilebiliyor (v1.674.0: Ödeme & Tahsilat'ta); (3) karşı taraf seçilmeden kayıt formu AÇILMIYOR; (4) kaydedilen
// hareket kartın adını ve GRUBUNU taşıyor (kârlılık raporu bu gruplardan çıkacak).
const { uygulamaAc, depoOku, modulAc, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];

  // ---- 1) TANIMLAR: hazır kartlarla başla + elle kart ekle
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  // 20 Eylül: kartlar Tanımlar'dan çıkıp Finans › Gelir / Gider ekranına taşındı.
  await sayfa.evaluate(() => { const g = document.querySelector('[data-nav-grup="Finans"]'); if (g) g.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Gelir / Gider"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const bosDurum = await sayfa.evaluate(() => ({
    hazirDugmesi: !!document.querySelector("[data-gider-hazir]"),
    kartYok: document.querySelectorAll("[data-gider-kart]").length === 0,
  }));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-hazir]"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-gider-ad]").fill("Numune giderleri");
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-gider-grup]");
    const o = [...s.options].find((x) => /Üretim/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const kartlar = (await depoOku(sayfa, "tanimlar:data")).giderKartlari || [];
  const tanimlar = {
    hazirSayisi: kartlar.length,
    elleEklenen: kartlar.filter((k) => k.ad === "Numune giderleri").map((k) => `${k.ad}:${k.grup}:${k.tur}`),
    kiraKarti: kartlar.filter((k) => /kira/i.test(k.ad)).map((k) => `${k.grup}:${k.tdhp}`),
  };
  await tarayici.close();

  // ---- 2) KASA: kart karşı taraf olarak
  const t2 = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.giderKartlari = [{ id: "gk1", ad: "İşyeri kirası", grup: "yonetim", tur: "gider", tdhp: "770.03" }];
  t2["tanimlar:data"] = JSON.stringify(tan);
  t2["muhasebe:data"] = JSON.stringify({ hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "kasa1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }] });
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  // v1.674.0: kasa formu kalktı — kart karşı taraf olarak ÖDEME & TAHSİLAT'ta seçiliyor (Ödeme + Nakit + kart).
  // Karşı taraf seçilmeden form hiç açılmıyor (cari ya da kart seçimi şart) — "karşılıksız reddedildi" bunu ölçer.
  await modulAc(ikinci.sayfa, "Ödeme & Tahsilat");
  await ikinci.sayfa.waitForTimeout(800);
  await ikinci.sayfa.locator('[data-odeme-tip="Ödeme"]:visible').click();
  await ikinci.sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  await ikinci.sayfa.waitForTimeout(300);
  // v1.681.0: kart cari kutusunda ("Cari / kart") — ayrı seçici yok.
  const kutu2 = ikinci.sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu2.click(); await kutu2.fill("İşyeri"); await ikinci.sayfa.waitForTimeout(300);
  const kartSecici = await ikinci.sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-secenek]")].some((b) => /İşyeri kirası/.test(b.textContent) && /gider kartı/.test(b.textContent)));
  const karsiliksizReddedildi = await ikinci.sayfa.evaluate(() => !document.querySelector("[data-kart-odeme-satiri]") && !document.querySelector("[data-odeme-satiri]"));
  await kutu2.press("Enter");
  await ikinci.sayfa.waitForTimeout(400);
  await ikinci.sayfa.locator("[data-kart-odeme-tutar]:visible").fill("12000");
  await ikinci.sayfa.locator("[data-kart-odeme-kaydet]:visible").click();
  await ikinci.sayfa.waitForTimeout(1500);
  const kayit = (((await depoOku(ikinci.sayfa, "muhasebe:data")).kasalar[0].hareketler) || [])
    .map((x) => `${x.yon}:${x.tutar}:${x.giderKartAd}:${x.giderGrubu}:${/^ODM-\d{7}$/.test(x.fisNo || "") ? "fişNo" : "fişsiz"}`);
  // v1.687.0 (kullanıcı: "gelir gider altta görünmüyor"): kart hareketi "Son tahsilat ve ödemeler" listesinde.
  const sonListe = await ikinci.sayfa.evaluate(() => [...document.querySelectorAll("[data-odeme-son-kart]")]
    .map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).slice(1, 5).join(" | ")));
  // v1.688.0 (kullanıcı: "kart olarak silinebilir sadece; kontrolleri koyalım, cari gibi"): hareketi olan kart silinemez;
  // hareket kartın ekstresinden silinir, sonra kart silinebilir.
  await modulAc(ikinci.sayfa, "Gelir / Gider");
  await ikinci.sayfa.waitForTimeout(700);
  await ikinci.sayfa.evaluate(() => document.querySelectorAll('[data-gg-grup][data-acik="0"]').forEach((b) => b.click()));  // v1.688.3: gruplar kapalı başlar
  await ikinci.sayfa.waitForTimeout(300);
  const kartKilitli = await ikinci.sayfa.locator('[data-gider-kart-silinemez="İşyeri kirası"]').count();
  await ikinci.sayfa.locator('[data-kart-ekstre="İşyeri kirası"]').first().click();
  await ikinci.sayfa.waitForTimeout(300);
  const sil = ikinci.sayfa.locator("[data-kart-hareket-sil] button").first();
  await sil.click(); await ikinci.sayfa.waitForTimeout(200);
  await ikinci.sayfa.locator("[data-kart-hareket-sil] button").last().click().catch(() => {});
  await ikinci.sayfa.waitForTimeout(300);
  // SilOnayButonu onay penceresi: "Sil" onayı.
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].reverse().find((x) => /^(Evet, sil|Sil|Onayla)$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(1200);
  const kalanHareket = ((((await depoOku(ikinci.sayfa, "muhasebe:data")).kasalar[0].hareketler) || []).filter((x) => x.giderKartId)).length;
  const kartAcildi = await ikinci.sayfa.locator('[data-gider-kart-silinemez="İşyeri kirası"]').count();
  await ikinci.tarayici.close();

  return { hatalar, bosDurum, tanimlar, kartSecici, karsiliksizReddedildi, kayit, sonListe, kartSilme: { kartKilitli, kalanHareket, kartAcildi } };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
