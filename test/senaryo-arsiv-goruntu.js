// SENARYO — SUNUCU ARŞİVİNDEN TEK PARÇA TABLO GÖRÜNTÜSÜNE BİRLEŞTİREREK DÖNÜŞ (v1.725.0).
//
// Kullanıcı (28 Ekim): telefonda Kasa & Banka "0 hesap" (24 Ekim'de 5 hesap). Arşiv Kasa/Banka'nın değişiklik öncesi hâlini günde
// bir tutuyor. Bakım › Sunucu arşivi › Kasa/Banka: görüntü satırı özetiyle listelenir ("2 kasa · 1 banka · 3 hareket · 1 çek");
// açılınca görüntü ve bugünkü bulut hâli yan yana; "Bugünkü hâlle birleştir" → bugünkü (boş kasalar + yeni kur + bugün eklenen
// banka) ile görüntünün birleşimi buluta tek yazmada gider (önce bulut okunmaz — birleştirmeyi kendisi yaptı), sayfa yenilenir.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const hatalar = [];
  const goruntu = {
    kasalar: [{ id: "K1", ad: "Merkez Kasa", hareketler: [{ id: "h1", tutar: 100 }, { id: "h2", tutar: -40 }] }, { id: "K2", ad: "Dolar Kasa", hareketler: [] }],
    bankalar: [{ id: "B1", ad: "Ziraat", hareketler: [{ id: "h3", tutar: 500 }] }],
    cekler: [{ id: "c1", cekNo: "123", tutar: 1000 }],
    kurlar: { USD: 49.65, EUR: 55.6 },
  };
  const bugun = { kasalar: [], bankalar: [{ id: "B9", ad: "Yeni Banka", hareketler: [] }], cekler: [], kurlar: { USD: 49.79, EUR: 55.52 } };
  const yazilan = [];
  const okunan = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/**", (r) => {
      const url = r.request().url();
      const tablo = (url.match(/rest\/v1\/([a-z_]+)/) || [])[1] || "";
      const yontem = r.request().method();
      if (tablo === "muhasebe" && yontem === "GET" && /id=eq\.tekil/.test(url)) {
        okunan.push("muhasebe");
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ veri: bugun }]) });
      }
      if (tablo === "muhasebe" && yontem === "POST") {
        yazilan.push(JSON.parse(r.request().postData() || "[]"));
        return r.fulfill({ status: 201, body: "" });
      }
      if (tablo === "silinen_arsiv" && yontem === "GET") {
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
          { id: 12, tablo: "muhasebe", islem: "GORUNTU", satir_id: "tekil", veri: { id: "tekil", veri: goruntu }, silen_eposta: null, zaman: "2026-10-24T09:00:00Z" },
        ]) });
      }
      return r.abort("failed");
    });
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="cop"]').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-sunucu-arsivi] select").first().selectOption("muhasebe");
  await sayfa.waitForTimeout(200);
  await sayfa.locator("[data-arsiv-yukle]").first().click();
  await sayfa.waitForTimeout(600);
  const satirBasligi = await sayfa.evaluate(() => [...document.querySelectorAll("[data-sunucu-arsivi] button")]
    .map((b) => b.textContent.replace(/\s+/g, " ").trim()).find((x) => /anlık görüntü/.test(x)) || "yok");
  // Satırı aç → özetler
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-sunucu-arsivi] button")].find((x) => /anlık görüntü/.test(x.textContent)); if (b) b.click(); });
  for (let i = 0; i < 20; i++) {
    await sayfa.waitForTimeout(150);
    if (!/okunuyor/.test(await sayfa.locator("[data-arsiv-guncel-ozet]").first().textContent().catch(() => "okunuyor"))) break;
  }
  const ozet = {
    goruntu: await sayfa.locator("[data-arsiv-goruntu-ozet]").first().textContent(),
    bugun: await sayfa.locator("[data-arsiv-guncel-ozet]").first().textContent(),
  };
  let onayMetni = "";
  sayfa.on("dialog", (d) => { onayMetni = d.message(); d.accept(); });
  await sayfa.locator("[data-arsiv-goruntu-birlestir]").first().click();
  await sayfa.waitForTimeout(800);
  const toast = await sayfa.evaluate(() => (document.body.innerText.match(/Kasa\/Banka birleştirildi[^\n]*/) || ["yok"])[0]);
  const gonderilen = yazilan[0] && yazilan[0][0] && yazilan[0][0].veri;
  const sonuc = gonderilen ? {
    kasalar: gonderilen.kasalar.map((k) => `${k.id}:${k.hareketler.map((h) => h.id).join(",")}`),
    bankalar: gonderilen.bankalar.map((b) => b.id),
    cekler: gonderilen.cekler.map((c) => c.id),
    kurUSD: gonderilen.kurlar.USD,
  } : null;
  await sayfa.waitForTimeout(1800);   // sayfa yenilenir; hata vermeden açılmalı
  await tarayici.close();
  return {
    satirBasligi, ozet,
    onayMetni: onayMetni.split("\n").filter((x) => /^(Görüntü|Bugün|Sonuç):/.test(x)),
    yazmaSayisi: yazilan.length, buluttanOkumaSayisi: okunan.length, sonuc, toast, hatalar,
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
