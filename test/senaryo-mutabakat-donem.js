// SENARYO — BANKA MUTABAKATI + DÖNEM KAPANIŞI + TERMİN (v1.672.0).
//  1) Ekstredeki masraf satırı, elle girilmiş aynı tutarlı banka çıkışıyla (1 gün fark) eşleşir → "sistemde var", işaretsiz.
//  2) Sistemde olup ekstrede olmayan hareket mutabakat listesinde çıkar.
//  3) Kapalı döneme düşen ekstre satırı "kapalı dönem" ve seçilemez; aktarımda yazılmaz.
//  4) Teslim tarihi geçmiş açık sipariş listede "gecikti" rozeti alır, ⏰ Geciken süzgecinde sayılır.
// Tarihler bugüne göre kurulur (çıktıda gün sayısı yerine yalnız durum yazılır), golden gün değişse de sabit kalır.
const fs = require("fs"); const os = require("os"); const path = require("path");
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const gun = (fark) => { const d = new Date(); d.setDate(d.getDate() + fark); return d; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tr = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

(async () => {
  const t = { ...TOHUM };
  const m = JSON.parse(t["muhasebe:data"]);
  m.bankalar = [{ id: "b1", ad: "Test Bankası", paraBirimi: "TRY", hareketler: [
    { id: "m1", tarih: iso(gun(-3)), yon: "Çıkış", tutar: 12.5, aciklama: "elle girilen masraf" },
    { id: "m2", tarih: iso(gun(-2)), yon: "Giriş", tutar: 999, aciklama: "ekstrede olmayan giriş" },
  ] }];
  t["muhasebe:data"] = JSON.stringify(m);
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), donemKapanis: iso(gun(-10)) };
  t["tanimlar:data"] = JSON.stringify(tan);
  const sp = JSON.parse(t["siparis:data"]);
  sp.push({ id: "sg", siparisNo: "SP-GEC", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: iso(gun(-20)), teslimTarihi: iso(gun(-5)),
    kalemler: [{ id: "kg", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birimFiyat: 100 }] });
  t["siparis:data"] = JSON.stringify(sp);

  const EKSTRE = path.join(os.tmpdir(), "mutabakat-senaryo.csv");
  fs.writeFileSync(EKSTRE, `Tarih;Açıklama;Tutar\n${tr(gun(-2))};EFT MÜŞTERİ B;1500,00\n${tr(gun(-2))};HAVALE MASRAFI;-12,50\n${tr(gun(-15))};ESKİ DÖNEM GİRİŞİ;50,00\n`);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);

  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-odeme-alani-sekme="bankaexcel"]:visible').first().click(); await sayfa.waitForTimeout(600);
  const ekran = sayfa.locator('[data-banka-excel]:visible');
  await ekran.locator('[data-banka-excel-dosya]').setInputFiles(EKSTRE); await sayfa.waitForTimeout(800);
  const satirlar = await ekran.locator("[data-banka-excel-satir]").evaluateAll((trs) => trs.map((r) => ({
    metin: r.cells[2].innerText.replace(/\(\d{2}\.\d{2}\.\d{4}/, "(TARİH"),
    secili: r.querySelector("input[type=checkbox]").checked,
    kilitli: r.querySelector("input[type=checkbox]").disabled,
  })));
  const eksik = await ekran.locator("[data-banka-excel-eksik-satir]").allInnerTexts();
  await ekran.locator('[data-banka-excel-oneri="0"]').click(); await sayfa.waitForTimeout(200);   // v1.674.0: öneri elle seçilir
  await ekran.locator('[data-banka-excel-kaydet]').click(); await sayfa.waitForTimeout(1200);
  const mh = await depoOku(sayfa, "muhasebe:data");
  const bankaHareketleri = mh.bankalar[0].hareketler.map((h) => `${h.yon} ${h.tutar}`).sort();

  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(800);
  const rozet = await sayfa.locator('[data-termin-rozet]:visible').evaluateAll((e) => e.map((x) => x.getAttribute("data-termin-rozet")));
  const cip = (await sayfa.locator('[data-termin-cip="gecikti"]:visible').first().innerText()).replace(/\s+/g, " ");

  console.log(JSON.stringify({ satirlar, eksik: eksik.map((x) => x.replace(/^\S+\s+/, "")), bankaHareketleri, rozet, cip, hatalar }, null, 1));
  await tarayici.close();
})();
