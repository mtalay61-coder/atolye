// SENARYO — YENİ CARİDE TÜM BİLGİLER (30 Ekim, v1.731.2).
// Kullanıcı: "Cari açarken tüm bilgileri girebilelim, cari kaydedip sonra düzenleme ekranı açmak gerekiyor şuanda".
// Ölçülen: (1) Müşteri: WhatsApp, e-posta, vergi dairesi, il, e-fatura mükellefi + posta kutusu tek seferde kaydedilir;
// (2) Personel: "Kod ata" prosesin bandındaki sıradaki kodu verir ve prosesi bağlar, ikinci proses elle bağlanır; e-fatura
// alanları personelde sorulmaz (formda yok, kayda girmez).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.prosesler = [{ id: "p1", ad: "Kesim", sira: 1, baslangicNo: 1000 }, { id: "p2", ad: "Saya", sira: 2, baslangicNo: 2000 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  // Kesim bandında 1000 dolu: sıradaki 1001 olmalı.
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c, i) => (i === 0 ? { ...c, barkodKodu: "1000" } : c)));
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);

  const ac = async (unvan) => {
    await sayfa.locator('button:has-text("Cari Ekle")').first().click();
    await sayfa.waitForTimeout(300);
    await sayfa.locator('input[placeholder="Örn. Deniz Ayakkabıcılık"]').fill(unvan);
  };
  const kaydet = async () => { await sayfa.locator("button.btn-save:has-text('Kaydet')").first().click(); await sayfa.waitForTimeout(600); };
  const oku = async (unvan) => ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.unvan === unvan) || null;
  const sec = (c, alanlar) => c && Object.fromEntries(alanlar.map((a) => [a, c[a] === undefined ? "(yok)" : c[a]]));

  // 1) Müşteri
  await ac("Tam Bilgili Müşteri");
  await sayfa.locator("[data-yeni-cari-whatsapp]").fill("0555 111 22 33");
  await sayfa.locator("[data-yeni-cari-eposta]").fill("satin@ornek.com");
  await sayfa.locator('[data-yeni-cari-alan="vergiDairesi"]').fill("Merter");
  await sayfa.locator('[data-yeni-cari-alan="il"]').fill("İstanbul");
  await sayfa.locator("[data-yeni-cari-efatura]").selectOption("evet");
  await sayfa.locator('input[placeholder="urn:mail:defaultpk@…"]').fill("urn:mail:defaultpk@ornek.com");
  await kaydet();
  const musteri = sec(await oku("Tam Bilgili Müşteri"),
    ["tip", "whatsapp", "eposta", "vergiDairesi", "il", "ilce", "efaturaMukellef", "efaturaEtiket", "barkodKodu", "bagliProsesler"]);

  // 2) Personel
  await ac("Yeni Kesimci");
  await sayfa.locator("[data-cari-tip-secici]").first().selectOption("Personel");
  await sayfa.waitForTimeout(200);
  const efaturaPersonelde = await sayfa.locator("[data-yeni-cari-efatura]").count();
  await sayfa.locator("[data-yeni-cari-kod-ata]").selectOption("Kesim");
  await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-yeni-cari-proses="Saya"]').click();
  const kutudakiKod = await sayfa.locator("[data-yeni-cari-barkod]").inputValue();
  await kaydet();
  const personel = sec(await oku("Yeni Kesimci"), ["tip", "barkodKodu", "bagliProsesler", "efaturaMukellef", "vergiDairesi"]);

  await tarayici.close();
  return { hatalar, musteri, personel, efaturaPersonelde, kutudakiKod };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
