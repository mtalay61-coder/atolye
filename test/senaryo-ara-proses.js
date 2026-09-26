// SENARYO — BİRDEN ÇOK ARA PROSES, HAMMADDELİ (26 Eylül, v1.477.0).
//
// Kullanıcı: "Ara prosese de hammadde eklenebilir olmalı, normal proses gibi hareket edecek ve bir
// prosesin altına birden fazla ara proses eklenebilmeli." (Seçim: hammaddesi normal proses gibi, ara
// proses yine kendiliğinden tamamlanır.)
//
// Kurulum: Bot'ta Kesim'in altına iki ara proses (Boya, Temizleme); Temizleme'nin reçetede hammaddesi
// var (çift başına 1 poşet). Üretim ESKİ biçimde (ara adımlar dizide yok), Kesim teslim alınmış.
// Ölçülenler — Saya işe verilince:
//   1. Boya ve Temizleme adımları Kesim ile Saya arasına sırayla yerleşiyor ve ikisi de tamamlanıyor.
//   2. Temizleme'nin poşeti stoktan düşüyor (3 çift × 1) — kendi fiş numarasıyla.
//   3. Poşet REZERVASYONDAN da düşüyor (normal proses gibi).
//   4. İki ara prosesin işçiliği ayrı fişlerle ara proses carisine yazılıyor.
//   5. Ürün kartı reçetesinde Kesim'in altında iki ara proses listeli; Temizleme grubu "Ara proses".
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }, { id: "p2", ad: "Saya", sira: 2 }];
  tanim.araProsesler = [{ id: "ap1", ad: "Boya", cariId: "c1", ucret: 2 }, { id: "ap2", ad: "Temizleme", cariId: "c1", ucret: 1 }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({ id: "poset", ad: "Poşet", kategori: "Hammadde", birim: "adet", alisFiyati: 1, variants: [{ renk: "", beden: "", miktar: 50, minStok: 0 }],
    hareketler: [{ id: "ps0", tarih: "2026-09-01", renk: "", beden: "", miktar: 50 }] });
  const bot = stok.find((p) => p.id === "u2");
  bot.recete = [
    ...(bot.recete || []).map((r) => ({ ...r, proses: "Kesim" })),
    { id: "rs1", proses: "Saya", hammaddeUrunId: "u1", hammaddeAd: (stok.find((p) => p.id === "u1") || {}).ad, renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 0.1, birim: "metre" },
    { id: "rt1", proses: "Temizleme", hammaddeUrunId: "poset", hammaddeAd: "Poşet", renk: "", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 1, birim: "adet" },
  ];
  bot.araProsesEklentileri = { Kesim: ["ap1", "ap2"] };
  t["stok:items"] = JSON.stringify(stok);
  t["stokrez:data"] = JSON.stringify([{ id: "srz1", urunId: "poset", urunAd: "Poşet", renk: "", beden: "", birim: "adet",
    siparisId: "sp1", siparisNo: "SAT-A1", uretimNo: "1001", miktar: 3, tuketilen: 0, tarih: "2026-09-20T08:00:00.000Z" }]);
  t["siparis:data"] = JSON.stringify([{ id: "sp1", siparisNo: "SAT-A1", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-20",
    kalemler: [{ id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY", planlama: { tip: "Üretim", referansNo: "1001" } }] }]);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up1", siparisNo: "1001", takipKodu: "1001", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "40", miktar: 3 }], beden: "Siyah · 40:3", rezervasyonSiparisId: "sp1",
    stogaEklendiMi: false, asama: "Saya", olusturuldu: "2026-09-20T08:00:00.000Z",
    prosesIlerleme: [
      { proses: "Kesim", sira: 1, tamamlandiMi: true, verildiMi: true, personelId: null,
        atamalar: [{ id: "at1", personelId: "c3", miktar: 3, bedenMiktarlari: { 40: 3 }, verildiMi: true, tamamlandiMi: true, verilmeTarihi: "2026-09-21", tamamlanmaTarihi: "2026-09-22" }] },
      { proses: "Saya", sira: 2, tamamlandiMi: false, personelId: null, atamalar: [] },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // 5. Ürün kartı reçetesi.
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /^Reçete/.test(x.textContent.trim())); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const recete = await sayfa.evaluate(() => ({
    kesimAltindakiAralar: [...document.querySelectorAll('[data-ara-prosesler="Kesim"] [data-ara-proses]')].map((d) => d.getAttribute("data-ara-proses")),
    araGruplari: [...document.querySelectorAll("[data-recete-ara-grup]")].map((d) => d.getAttribute("data-recete-ara-grup")),
    eklenebilir: [...((document.querySelector('[data-ara-proses-ekle="Saya"]') || {}).options || [])].map((o) => o.textContent),
  }));

  // 1-4. Üretim kartı → Saya'yı Personel C'ye ver.
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("*")].filter((x) => x.children.length === 0 && x.textContent.trim() === "1001" && x.getBoundingClientRect().width > 0).pop(); if (e) e.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => x.getBoundingClientRect().width > 0 && [...x.options].some((o) => /Personel seçin/.test(o.textContent)));
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    set.call(s, "c3"); s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /İşi Ver/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);

  const u = ((await depoOku(sayfa, "uretim:siparisler")) || []).find((x) => x.id === "up1") || {};
  const adimlar = (u.prosesIlerleme || []).map((p) => `${p.proses}${p.araProsesMi ? " (ara)" : ""}: ${p.tamamlandiMi ? "tamam" : (p.atamalar || []).length ? "verildi" : "bekliyor"}`);
  const stokSon = (await depoOku(sayfa, "stok:items")) || [];
  const poset = stokSon.find((p) => p.id === "poset") || {};
  const posetCikis = (poset.hareketler || []).filter((h) => h.uretimId === "up1").map((h) => `${h.miktar} · ${h.fisNo}`);
  const rez = ((await depoOku(sayfa, "stokrez:data")) || []).map((r) => `${r.urunAd}: ${r.tuketilen}/${r.miktar}`);
  const cari = (((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1") || {}).hareketler || [];
  const iscilik = cari.filter((h) => h.uretimId === "up1").map((h) => `${h.fisNo} · ${h.tutar} ₺`).sort();

  await tarayici.close();
  return { hatalar, recete, adimlar, posetCikis, posetStok: (poset.variants || [])[0] && poset.variants[0].miktar, rez, iscilik };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
