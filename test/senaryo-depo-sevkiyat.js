// SENARYO — DEPO > SEVKİYAT (22 Eylül v1.415.0; 23 Eylül v1.420.0 "koliden sevk tek yol",
// v1.422.0 "satış tek ekran") (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "depoya sevkiyat ekleyelim, depodan sevk etmek için, hem barkod okuyucuyu kullanarak,
// kolilenmiş ürünler vs okutarak sevk ederiz" + (v1.420) "koli okutulunca direkt cariyi seçip
// koliyi eklesin; farklı müşterilerin kolileri varsa ayrı fişler atsın. Bu 'koliden ekle' mantığı
// cari içinden satış açınca da olsun, aynı yere çıksın."
//
// Kurulum: 125 Model (Bej 37:20, 38:20). Üretim 10002 → SAT-9'un (Müşteri B) planlama referansı.
//   K-001: yalnız üretime bağlı (sipariş ÜRETİM üzerinden bulunmalı)  37:3 38:5
//   K-002: yalnız cari (Tedarikçi A), siparişi yok → SERBEST            37:2
//   K-003: hiçbir bağı yok → "carisi belli olmayan"                     38:1
//   K-004: zaten sevk edilmiş (SF-0921007)
//
// Ölçülenler:
//   1. Okutma tepkileri: bilinmeyen kod, ÜRÜN etiketi ("koli barkodu okutulur"), sevk edilmiş koli
//      (fiş no ile), aynı koli ikinci kez ("zaten listede").
//   2. Gruplama CARİYE göre: Müşteri B grubu "SAT-9", satırlar siparişe bağlı; Tedarikçi A grubu
//      satırları "serbest"; K-003 ayrı uyarıda.
//   3. Ekran KAYIT YAPMAZ (v1.422): "Satış fişini aç" cari satış fişini koli satırlarıyla açar, grup
//      listeden düşer; kayıt fişte. Müşteri B kaydı: stok 20→17 / 20→15, karşılanan 37=3 / 38=5,
//      K-001 "Sevk edildi" + fiş no, fiş defterinde kayıt. Tedarikçi A (serbest): stok 17→15,
//      karşılanan DEĞİŞMEDİ, K-002 sevk edildi. K-003 hâlâ uyarıda.
//   4. Aynı çözücü cari fişinde (ayrı oturum): Müşteri B satış fişinde "Koli okut" K-001 → "eklendi ·
//      2 satır · SAT-9 (üretim)"; başka carinin kolisi (K-002) reddedilir; kayıt → Sil → koli "Hazır",
//      stok 20, karşılanan 0 (fiş geri alınınca koli geri gelir).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohumKur() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", stokNo: 125,
    variants: [
      { renk: "Bej", beden: "37", miktar: 20, barkod: "80000101" },
      { renk: "Bej", beden: "38", miktar: 20, barkod: "80000102" },
    ],
    hareketler: [], recete: [], birimFiyat: 465, satisFiyati: 500,
  });
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: [
      { id: "k1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY", planlama: { tip: "Üretim", referansNo: "10002" } },
      { id: "k2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY", planlama: { tip: "Üretim", referansNo: "10002" } },
    ],
  }]);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "ur2", siparisNo: "10002", model: "125 Model", urunId: "m1", renk: "Bej",
    durum: "Tamamlandı", tarih: "2026-09-10",
    bedenMiktarlari: [{ beden: "37", miktar: 10 }, { beden: "38", miktar: 10 }],
    prosesIlerleme: [],
  }]);
  const koli = (id, kod, ek, kalemler) => ({
    id, kod, durum: "Hazır", olusturma: "2026-09-21T08:00:00.000Z", siparisId: "", cariId: "", uretimId: "", not: "",
    ...ek, kalemler: kalemler.map(([beden, adet]) => ({ urunId: "m1", urunAd: "125 Model", renk: "Bej", beden, adet })),
  });
  t["koli:data"] = JSON.stringify([
    koli("koli-1", "K-001", { uretimId: "ur2" }, [["37", 3], ["38", 5]]),
    koli("koli-2", "K-002", { cariId: "c1" }, [["37", 2]]),
    koli("koli-3", "K-003", {}, [["38", 1]]),
    koli("koli-4", "K-004", { cariId: "c2", durum: "Sevk edildi", sevkFisNo: "SF-0921007" }, [["37", 1]]),
  ]);
  return t;
}

const toastOku = (sayfa) => sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); return t ? t.textContent.trim() : null; });
const toastKapat = (sayfa) => sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); if (t) t.click(); });

// Kayıtların özeti: stok, karşılanan, koli durumları, fiş defteri.
async function durum(sayfa) {
  const m1 = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m1") || {};
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "s9") || {};
  const koliler = (await depoOku(sayfa, "koli:data")) || [];
  const defter = (await depoOku(sayfa, "fisdefter:data")) || [];
  return {
    stok: (m1.variants || []).map((v) => `${v.beden}=${v.miktar}`).join(" "),
    karsilanan: (sip.kalemler || []).map((k) => `${k.beden}=${k.karsilanan || 0}`).join(" "),
    koliler: koliler.map((k) => `${k.kod} ${k.durum}${k.sevkFisNo ? ` (${k.sevkFisNo})` : ""}`),
    defter: defter.filter((d) => /^SF-/.test(d.fisNo || "")).map((d) => `${d.fisNo}${d.iptal ? " iptal" : ""}`),
  };
}

async function fisiKaydet(sayfa) {
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1500);
}

async function depoEkrani(t, hatalar) {
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  const stokNo = (((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m1") || {}).stokNo;
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button[title="Kolileri okutup depodan sevk et"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  const okut = async (kod) => {
    await sayfa.locator("[data-sevk-girdi]:visible").first().fill(kod);
    await sayfa.locator("[data-sevk-girdi]:visible").first().press("Enter");
    await sayfa.waitForTimeout(400);
    const t2 = await toastOku(sayfa);
    await toastKapat(sayfa);
    return t2;
  };
  // 1) OKUTMA TEPKİLERİ
  const tepkiler = {
    bilinmeyen: await okut("K-999"),
    // Stok düzeyi ürün etiketi: "90" + 4 haneli stok no.
    urunEtiketi: await okut(`90${String(stokNo).padStart(4, "0")}`),
    sevkEdilmis: await okut("K-004"),
    k001: await okut("K-001"),
    k001Tekrar: await okut("K-001"),
    k002: await okut("K-002"),
    k003: await okut("K-003"),
  };
  await sayfa.waitForTimeout(300);
  const ekranOku = () => sayfa.evaluate(() => ({
    gruplar: [...document.querySelectorAll("[data-sevk-grup]")].map((g) => ({
      cari: g.getAttribute("data-sevk-grup"),
      baslik: (g.firstElementChild || g).innerText.replace(/\s+/g, " ").trim(),
      satirlar: [...g.querySelectorAll("[data-sevk-satir]")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join(" | ")),
    })),
    carisiz: (() => { const e = document.querySelector("[data-sevk-carisiz]"); return e ? (e.querySelector("b") || e).textContent + " " + [...e.querySelectorAll("button")].map((b) => b.textContent.trim()).join(", ") : null; })(),
    sonuc: (() => { const e = document.querySelector("[data-sevk-sonuc]"); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; })(),
    hepsiDugmesi: !!document.querySelector("[data-sevk-hepsi]"),
  }));
  return { tarayici, sayfa, tepkiler, ekranOku };
}

async function calistir() {
  const hatalar = [];
  const sonuc = { hatalar };

  // ——— 1-3) DEPO > SEVKİYAT ———
  {
    const { tarayici, sayfa, tepkiler, ekranOku } = await depoEkrani(tohumKur(), hatalar);
    sonuc.tepkiler = tepkiler;
    sonuc.okutmaSonrasi = await ekranOku();
    sonuc.baslangic = await durum(sayfa);

    // Müşteri B → fiş penceresi koli satırlarıyla açılır; ekran kaydetmez.
    await sayfa.locator('[data-sevk-et="Müşteri B"]:visible').first().click();
    await sayfa.waitForTimeout(1200);
    const fisPenceresi = await sayfa.evaluate(() => ({
      koliOzeti: ((document.querySelector("[data-fis-koliler] b") || {}).textContent || null),
      koliler: [...document.querySelectorAll("[data-fis-koli]")].map((e) => e.getAttribute("data-fis-koli")),
    }));
    const pencereAcikkenKayit = await durum(sayfa);
    await fisiKaydet(sayfa);
    sonuc.musteriB = { fisPenceresi, pencereAcikkenKayitDegismedi: JSON.stringify(pencereAcikkenKayit) === JSON.stringify(sonuc.baslangic), ...(await durum(sayfa)) };
    // Sevkiyat ekranına dön (fiş penceresi kapandı): Müşteri B grubu düştü, sonuç şeridi var.
    await modulAc(sayfa, "Depo");
    await sayfa.waitForTimeout(500);
    sonuc.musteriBSonrasiEkran = await ekranOku();

    await sayfa.locator('[data-sevk-et="Tedarikçi A"]:visible').first().click();
    await sayfa.waitForTimeout(1200);
    await fisiKaydet(sayfa);
    sonuc.tedarikciA = await durum(sayfa);
    await modulAc(sayfa, "Depo");
    await sayfa.waitForTimeout(500);
    sonuc.sonEkran = await ekranOku();
    await tarayici.close();
  }

  // ——— 4) CARİ FİŞİNDE AYNI ÇÖZÜCÜ (koli okut) + GERİ ALMA ———
  {
    const { tarayici, sayfa } = await uygulamaAc(tohumKur(), { hataYaz: false });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    await sayfa.waitForTimeout(2300);
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(500);
    await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
    await sayfa.waitForTimeout(600);
    await sayfa.locator('[data-cari-fis-ac="Satış"]:visible').first().click();
    await sayfa.waitForTimeout(800);
    const koliOkut = async (kod) => {
      await sayfa.locator("[data-koli-okut]:visible").first().fill(kod);
      await sayfa.locator("[data-barkod-ekle]:visible").first().click();
      await sayfa.waitForTimeout(600);
      const t2 = await toastOku(sayfa);
      await toastKapat(sayfa);
      return t2;
    };
    const k001 = await koliOkut("K-001");
    const baskaCari = await koliOkut("K-002");
    const fisteKoliler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-koli]")].map((e) => e.getAttribute("data-fis-koli")));
    await fisiKaydet(sayfa);
    const kayitSonrasi = await durum(sayfa);
    // Fişi sil (cari kartındaki son hareket) — koli "Hazır"a dönmeli.
    // Fiş cari kartından açıldığı için kart hâlâ açık olabilir; kapalıysa açılır (tıklama kartı
    // kapatıp açan bir anahtar — körlemesine tıklamak açık kartı kapatıyordu).
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(500);
    if (!(await sayfa.locator('button[title="Sil"]:visible').count())) {
      await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
      await sayfa.waitForTimeout(700);
    }
    await sayfa.locator('button[title="Sil"]:visible').last().click();
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-sil-onayla]").first().click();
    await sayfa.waitForTimeout(1600);
    sonuc.cariFisi = { k001, baskaCari, fisteKoliler, kayitSonrasi, silindiktenSonra: await durum(sayfa) };
    await tarayici.close();
  }
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
