// SENARYO — GÜNLÜK MATRİSİ (v1.673.0, kullanıcı: "log takibi detaylı değil; matris şeklinde ve okunaklı olsun").
// Günlük tablosu sahte yanıtla doldurulur. Ölçülen: kullanıcı × modül matrisi sayıları; hücreye tıklayınca akış
// tablosu o kullanıcı + modülle süzülür; Türkçe modül adları.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
(async () => {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: true,
    kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "Mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true }] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const simdi = Date.now();
  const z = (dk) => new Date(simdi - dk * 60000).toISOString();
  const kayitlar = [
    { id: "l1", zaman: z(5), kullanici_ad: "Mahmut", eylem: "Satış fişi kesildi", kapsam: "cari", ayrinti: { fisNo: "SF-1", tutar: 1000 } },
    { id: "l2", zaman: z(15), kullanici_ad: "Mahmut", eylem: "Tahsilat", kapsam: "cari", ayrinti: { fisNo: "THS-1" } },
    { id: "l3", zaman: z(25), kullanici_ad: "Ayşe", eylem: "Stok kartı güncellendi", kapsam: "stok", ayrinti: { urun: "Bot" } },
    { id: "l4", zaman: z(35), kullanici_ad: "Ayşe", eylem: "Sipariş açıldı", kapsam: "siparis", ayrinti: { siparisNo: "SP-1" } },
    { id: "l5", zaman: z(45), kullanici_ad: "Mahmut", eylem: "Giriş", kapsam: "oturum", ayrinti: {} },
  ];
  await sayfa.route("**/auth/v1/token**", (r) => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ access_token: "jeton-a", refresh_token: "r", expires_in: 3600, user: { email: "mahmut@atolye.local" } }) }));
  await sayfa.route("**/rest/v1/gunluk**", (r) => (r.request().method() === "GET"
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(kayitlar) })
    : r.fulfill({ status: 201, body: "" })));
  await sayfa.waitForTimeout(2500);
  await sayfa.locator('input:not([type="password"])').first().fill("Mahmut");
  await sayfa.locator('input[type="password"]').first().fill("gizli123");
  await sayfa.getByRole("button", { name: "Giriş Yap" }).click();
  await sayfa.waitForTimeout(1500);
  await sayfa.locator('[data-nav="Günlük"]:visible').first().click(); await sayfa.waitForTimeout(1200);
  const matris = await sayfa.locator("[data-gunluk-matris] table").first().evaluate((tb) => [...tb.rows].map((r) => [...r.cells].map((c) => c.innerText.trim()).join(" | ")));
  await sayfa.locator('[data-gunluk-matris-satir="Ayşe"] td').nth(3).click().catch(() => {});
  await sayfa.waitForTimeout(400);
  const akis = await sayfa.locator("[data-gunluk-akis] tbody tr").evaluateAll((rs) => rs.map((r) => [...r.cells].slice(1).map((c) => c.innerText.trim()).join(" | ")));
  console.log(JSON.stringify({ matris, akis, hatalar }, null, 1));
  await tarayici.close();
})();
