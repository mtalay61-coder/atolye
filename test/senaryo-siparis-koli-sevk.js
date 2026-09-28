// SENARYO — SİPARİŞTEN SATIŞTA KOLİLER KAPANIYOR (23 Eylül, v1.423.0; v1.425.0'da fiş BOŞ açılıyor,
// koliler elle okutuluyor) (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı (4 ekran görüntüsü): üretim 10002 (Angelina · SAT-1001, 19 koli) sevk edildi → depoda
// "kolide 152, serbest −152", Paketleme'de koliler "Hazır" duruyor. "Kolilenmiş ürünleri sevk
// ettiğimizde kapatması gerekir; eklerken koli koli eklemesi, toplu adet ve koli no'larını
// kaydetmesi lazım; siparişe bağlı koliler siparişte bilinmeli."
//
// Kurulum: 125 Model Bej 37:8 38:8 (hepsi kolide). SAT-9 (Müşteri B) 37:8 38:8, planlama referansı
// üretim 10002. K-A ve K-B: üretimden (siparisId YOK), ikisi de 37:4 38:4 — AYNI bedenler iki
// kolide: `fisYaz`ın eski "yalnız ilk eşleşen hareket" hatası burada ikinci varyant açıyordu.
//
// Ölçülenler:
//   1. Sipariş kartında "Koliler" bölümü TÜRETİLİYOR (koli › üretim › sipariş): 2 koli · 16 çift, hazır.
//   2. "Satış Fişi Oluştur" fişi BOŞ açar (v1.425); K-A, K-B okutulunca "2 koli · 16 çift".
//   3. Kaydet → iki koli "Sevk edildi (SF-…)", stok 37=0 38=0 ve TEK varyant (37:−4 açılmadı),
//      karşılanan tam (8/8), Mamul Deposu "kolide 0 · açık 0", kartta iki koli fiş no ile.
//   4. (Ayrı oturum) Kolideki mal DÜZ satırla satılırsa fişte uyarı (serbest 0, kolide 8).
//   5. Paketleme "Elle kapat": seçili koli "Sevk edildi", sevkFisNo boş, sebep + kim saklanır;
//      stok DEĞİŞMEZ; sipariş kartında "elle kapatıldı".
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohumKur() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [{ renk: "Bej", beden: "37", miktar: 8 }, { renk: "Bej", beden: "38", miktar: 8 }],
    hareketler: [], recete: [], birimFiyat: 465, satisFiyati: 500,
  });
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: ["37", "38"].map((b, i) => ({ id: `k${i + 1}`, urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: b, miktar: 8,
      karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY", planlama: { tip: "Üretim", referansNo: "10002" } })),
  }]);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "ur2", siparisNo: "10002", model: "125 Model", urunId: "m1", renk: "Bej", durum: "Tamamlandı", tarih: "2026-09-10", stogaEklendiMi: true,
    bedenMiktarlari: [{ beden: "37", miktar: 8 }, { beden: "38", miktar: 8 }], prosesIlerleme: [],
  }]);
  const koli = (id, kod) => ({ id, kod, durum: "Hazır", olusturma: "2026-09-21T08:00:00.000Z", siparisId: "", cariId: "", uretimId: "ur2", not: "",
    kalemler: [["37", 4], ["38", 4]].map(([beden, adet]) => ({ urunId: "m1", urunAd: "125 Model", renk: "Bej", beden, adet })) });
  t["koli:data"] = JSON.stringify([koli("koli-a", "K-A"), koli("koli-b", "K-B")]);
  return t;
}

const metin = (s) => (s || "").replace(/\s+/g, " ").trim();

async function durum(sayfa) {
  const m1 = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m1") || {};
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "s9") || {};
  const koliler = (await depoOku(sayfa, "koli:data")) || [];
  return {
    stok: (m1.variants || []).map((v) => `${v.renk} ${v.beden}=${v.miktar}`),
    karsilanan: (sip.kalemler || []).map((k) => `${k.beden}=${k.karsilanan || 0}/${k.miktar}`).join(" "),
    koliler: koliler.map((k) => `${k.kod} ${k.durum}${k.sevkFisNo ? ` (${k.sevkFisNo})` : ""}`
      + (k.elleKapatildi ? ` elle: "${k.elleKapatildi.sebep}" kim=${k.elleKapatildi.kim ? "var" : "yok"} zaman=${k.elleKapatildi.zaman ? "var" : "yok"}` : "")),
  };
}

async function siparisKartiAc(sayfa) {
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-durum-cip="Tümü"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-9" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
}

const kartKolileri = (sayfa) => sayfa.evaluate(() => {
  const e = document.querySelector('[data-siparis-kolileri="SAT-9"]');
  if (!e) return null;
  return {
    ozet: [...e.firstElementChild.children].map((c) => c.textContent.replace(/\s+/g, " ").trim()).join(" | "),
    koliler: [...e.querySelectorAll("[data-siparis-koli]")].map((k) => k.textContent.replace(/\s+/g, " ").trim()
      + (k.getAttribute("title") ? ` [${k.getAttribute("title")}]` : "")),
  };
});

async function mamulOzeti(sayfa) {
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title="Mamul stoğu, siparişlere ayrılan ve serbest miktar"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  return sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("span.mono")].find((e) => /^stok .* kolide /.test(e.textContent.replace(/\s+/g, " ").trim()));
    // Genel toplam tohumdaki Bot'u da içeriyor; ölçülen yalnız koli ile ilgili sayılar.
    const m = s ? s.textContent.replace(/\s+/g, " ").match(/kolide (\d+) .* talep (\d+) · açık (\d+)/) : null;
    return m ? `kolide ${m[1]} · talep ${m[2]} · açık ${m[3]}` : null;
  });
}

async function fisiKaydet(sayfa) {
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1500);
}

async function calistir() {
  const hatalar = [];
  const sonuc = { hatalar };

  // ——— 1-3) SİPARİŞ KARTINDAN FİŞ, KOLİLER OKUTULUR ———
  {
    const { tarayici, sayfa } = await uygulamaAc(tohumKur(), { hataYaz: false });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    await sayfa.waitForTimeout(2300);
    // Başlangıçta "açık" 0 olmalı (v1.506.0, kullanıcı onayı): siparişin KENDİ kolisindeki mal o siparişin
    // açığını kapatır. Önce 16 görünüyordu — hazır mal "üretilmeli" sayılıyordu.
    sonuc.baslangic = { ...(await durum(sayfa)), mamulDepo: await mamulOzeti(sayfa) };
    await siparisKartiAc(sayfa);
    sonuc.kartOnce = await kartKolileri(sayfa);
    await sayfa.locator("[data-fis-olustur]:visible").first().click();
    await sayfa.waitForTimeout(900);
    const bosAcildi = await sayfa.evaluate(() => !document.querySelector("[data-fis-koliler]"));
    const okut = async (kod) => {
      await sayfa.locator("[data-koli-okut]:visible").first().fill(kod);
      await sayfa.locator("[data-barkod-ekle]:visible").first().click();
      await sayfa.waitForTimeout(600);
    };
    await okut("K-A");
    await okut("K-B");
    const fis = await sayfa.evaluate(() => ({
      koliOzeti: ((document.querySelector("[data-fis-koliler] b") || {}).textContent || null),
      koliler: [...document.querySelectorAll("[data-fis-koli]")].map((e) => e.getAttribute("data-fis-koli")),
      koliUyarisi: !!document.querySelector("[data-fis-koli-uyarisi]"),
    }));
    await fisiKaydet(sayfa);
    const kayit = await durum(sayfa);
    const kartSonra = await kartKolileri(sayfa);
    sonuc.siparistenSevk = { bosAcildi, fis, kayit, kartSonra, mamulDepo: await mamulOzeti(sayfa) };
    await tarayici.close();
  }

  // ——— 4-5) DÜZ SATIŞ UYARISI + ELLE KAPATMA ———
  {
    const { tarayici, sayfa } = await uygulamaAc(tohumKur(), { hataYaz: false });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    // Elle kapatma sebebi window.prompt ile soruluyor.
    const sorular = [];
    sayfa.on("dialog", (d) => { sorular.push(d.message().split("\n")[0]); d.accept("Düz satırla satıldı"); });
    await sayfa.waitForTimeout(2300);
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(500);
    await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
    await sayfa.waitForTimeout(600);
    await sayfa.locator('[data-cari-fis-ac="Satış"]:visible').first().click();
    await sayfa.waitForTimeout(800);
    const etiket = await sayfa.evaluate(() => {
      const dl = document.getElementById("fis-urun-listesi");
      const o = dl ? [...dl.options].find((x) => x.value.includes("125 Model")) : null;
      return o ? o.value : "125 Model";
    });
    await sayfa.locator("[data-urun-arama]").first().fill(etiket);
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-renk-arama]").first().fill("Bej");
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("500");
    await sayfa.locator('[data-kalem-miktar="37"]:visible').first().fill("4");
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(500);
    const uyari = await sayfa.evaluate(() => { const e = document.querySelector("[data-fis-koli-uyarisi]"); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; });
    await fisiKaydet(sayfa);
    const duzSatisSonrasi = await durum(sayfa);

    // Paketleme: yalnız K-A seçilip elle kapatılır.
    await modulAc(sayfa, "Paketleme");
    await sayfa.waitForTimeout(800);
    await sayfa.locator('[data-koli-sec="K-A"]:visible').first().check();
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-koli-elle-kapat]:visible").first().click();
    await sayfa.waitForTimeout(1000);
    const elleKapatma = { sorular, ...(await durum(sayfa)) };
    await siparisKartiAc(sayfa);
    elleKapatma.kart = await kartKolileri(sayfa);
    sonuc.duzSatis = { uyari, duzSatisSonrasi, elleKapatma, stokDegismedi: JSON.stringify(elleKapatma.stok) === JSON.stringify(duzSatisSonrasi.stok) };
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
