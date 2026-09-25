// SENARYO — ALIŞ FİŞİ İHTİYAÇTAN DOLUYOR.
//
// Kullanıcı (7 Eylül): "Depodan alış fişi oluşturduğumuzda ihtiyaç otomatik çeksin, tekrar elle
// girmeyelim."
//
// Depo'dan tek ürünle geliniyordu; o tedarikçiden alınacak DİĞER eksikler ekranda görünmüş olsa
// bile fişe tek tek yazılıyordu.
//
// ÜÇ ŞEY ÖLÇÜLÜYOR:
//   1. TIKLANAN SATIR kalem olarak geliyor — ürün, renk ve MİKTAR hazır. Kullanıcı (7 Eylül):
//      "Alış fişine tıkladığımda tıklanan ihtiyacı otomatik ekrana getirsin; şu anda hammadde,
//      renk ve miktar giriyoruz." Önce yalnız form alanları doluyordu ve kalem listesine girmesi
//      için ayrıca "Kalem Ekle"ye basmak gerekiyordu.
//   2. Aynı tedarikçinin DİĞER eksikleri de geliyor.
//   3. BAŞKA tedarikçinin eksiği GELMİYOR — fiş tek cariye kesiliyor, başkasının malını o fişe
//      koymak borcu yanlış yere yazardı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);

  // Reçeteye mamul renk/beden eşleşmesi ekleniyor: MRP bu alanlarla çalışıyor.
  const bot = stok.find((p) => p.id === "u2");
  bot.recete = bot.recete.map((r) => ({ ...r, mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler" }));

  // Deri → tedarikçi c1, stoğu sıfır (iki rengi de eksik).
  const deri = stok.find((p) => p.id === "u1");
  deri.tedarikciId = "c1";
  // ÜRÜN PARA BİRİMİNİ SEMBOL OLARAK TUTUYOR ("$"), muhasebe KOD bekliyor ("USD").
  // Kullanıcı (9 Eylül) bunu bildirdi: kalem "$" taşıyınca seçicide "TRY" görünüyor ama hesap
  // dolarla yapılıyor ve "Kur eksik: $ → TRY" çıkıyordu.
  deri.alisFiyati = 0.22;
  deri.alisParaBirimi = "$";
  deri.variants = deri.variants.map((v) => ({ ...v, miktar: 0 }));

  // KOPÇA → AYNI tedarikçi (c1), stoğu yok, Bot'un reçetesinde. Yani MRP'de eksik çıkıyor.
  // Kullanıcı 12 Eylül'de bunun fişe GİRMEMESİNİ istedi: "sadece tıkladığım gelsin".
  // (Tohumdaki `u3`/Taban yalnızca reçetede geçen bir kimlik, ürün kaydı yok — o ölçüm
  // kendiliğinden geçiyordu; gerçek karşılaştırma bu üründe.)
  stok.push({
    id: "u4", ad: "Kopça", kategori: "Hammadde", birim: "adet", olcuTipi: "Serbest",
    tedarikciId: "c1", alisFiyati: 3, alisParaBirimi: "₺", satisFiyati: 0, satisParaBirimi: "₺",
    hareketler: [], recete: [], ekFiyatlar: [], prosesUcretleri: {}, ozelKodlar: {},
    variants: [{ renk: "Standart", beden: "Standart", miktar: 0, minStok: 0 }],
  });
  bot.recete = [...bot.recete, {
    proses: "Kesim", hammaddeUrunId: "u4", hammaddeAd: "Kopça", renk: "Standart", beden: "Standart",
    miktar: 2, birim: "adet", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler",
  }];
  t["stok:items"] = JSON.stringify(stok);

  // SON ALIŞ NOTU (kullanıcı, 12 Eylül): tedarikçiye önceden kesilmiş bir alış fişi — Deri Siyah
  // 0,25 $ ile alınmış. Fişte "son 0,25 $" notu çıkmalı; kalem 0,22 geldiği için farklı (turuncu).
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c1"
    ? { ...c, hareketler: [{ id: "h-eski", tarih: "2026-09-01", zaman: "2026-09-01T09:00:00.000Z", yon: "Alacak", tutar: 2.5,
        paraBirimi: "USD", fisNo: "AF-20260901-001", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 10, birim: "metre",
        birimFiyat: 0.25, defter: "Genel", odemeSekli: "Nakit" }] }
    : c));
  t["cari:data"] = JSON.stringify(cariler);

  // Depo'da "Alış Fişi" düğmesinin çıkması için açığı olan bir rezervasyon gerekiyor.
  // İKİ RENK, AYNI BEDEN: Depo satırı ürünün bütün renklerini tek grupta topluyor. Eskiden düğme
  // miktarları yalnız BEDENE göre topluyordu (iki renk birbirini eziyordu) ve renk göndermiyordu.
  t["stokrez:data"] = JSON.stringify([{
    id: "sr1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", birim: "metre",
    siparisId: "s9", siparisNo: "SAT-9", uretimNo: "10007", miktar: 20, tuketilen: 0,
    tarih: "2026-09-01T08:00:00.000Z",
  }, {
    id: "sr2", urunId: "u1", urunAd: "Deri", renk: "Taba", beden: "", birim: "metre",
    siparisId: "s9", siparisNo: "SAT-9", uretimNo: "10007", miktar: 7, tuketilen: 0,
    tarih: "2026-09-01T08:00:00.000Z",
  }]);
  // Bekleyen satış siparişi: MRP ihtiyacı buradan doğuyor.
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01",
    kalemler: [{ id: "k9", urunId: "u2", renk: "Siyah", beden: "41", miktar: 10, durum: "Bekliyor" }],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Alış Fişi/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1800);

  const sonAlisNotu = await sayfa.evaluate(() => [...document.querySelectorAll("[data-son-alis]")]
    .map((e) => `${e.getAttribute("data-son-alis")}:${e.textContent.replace(/\s+/g, " ").trim()}:${getComputedStyle(e).color === "rgb(184, 92, 46)" ? "farkli" : "ayni"}`));
  const metin = await sayfa.evaluate(() => document.body.innerText);

  // KALEMLER SATIR SATIR: ürün · renk · girilen miktarlar. Kullanıcı (11 Eylül): "İhtiyaç 880 çift
  // Gold rengi ama alış fişinde fazla gösteriyor" — aynı ihtiyaç bir renksiz bir renkli iki satır
  // olarak geliyordu. Yalnız "Deri geldi mi" ölçmek bunu hiç görmüyordu (eski ölçüm "3 kalem"i
  // doğru sanıp altına almıştı).
  const kalemSatirlari = await sayfa.evaluate(() => [...document.querySelectorAll("tr")]
    .filter((tr) => tr.getBoundingClientRect().height > 0 && tr.querySelector('input[type="number"]') && tr.children.length > 3)
    .map((tr) => {
      const td = [...tr.children];
      const miktarlar = [...tr.querySelectorAll('input[type="number"]')].map((i) => i.value).filter((v) => v !== "");
      return `${td[0].textContent.trim()} · ${td[1].textContent.trim() || "(renksiz)"} · ${miktarlar[0] || ""}`;
    }));

  const kalemParaBirimleri = await sayfa.evaluate(() =>
    [...document.querySelectorAll("select")]
      .filter((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR")
      .map((x) => x.value));

  // STOK KARTI → Fiyatlandırma: son alış listesi ve kart farkı (0,25 vs kart 0,22 → +13,6%).
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Deri" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Fiyatlandırma"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const kartSonAlis = await sayfa.evaluate(() => {
    const kap = document.querySelector("[data-son-alislar]");
    return kap && {
      sayi: kap.getAttribute("data-son-alislar"),
      satirlar: [...kap.querySelectorAll("[data-son-alis-satir]")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join(" · ")),
    };
  });

  await tarayici.close();
  return {
    sonAlisNotu, kartSonAlis,
    hatalar,
    // Tıklanan satır kalem listesinde ve miktarıyla birlikte.
    tiklananKalemGeldi: /Deri/.test(metin),
    // Tıklanan satırın MİKTARI da geldi mi: Siyah rezervasyon açığı 20 metre. Eskiden hücre
    // metninde "20" aranıyordu; miktar bir GİRİŞ KUTUSUNDA duruyor ve ikinci renk eklenince ölçüm
    // yanlışlıkla false verdi. Artık kalem satırının kendisinden okunuyor.
    tiklananMiktarGeldi: kalemSatirlari.includes("Deri · Siyah · 20"),
    kalemSatirlari,
    // Kalemlerin NEREDEN geldiği söyleniyor: 18 satırın kendiliğinden belirmesi, söylenmezse
    // "ben bunları girmedim" sorusu doğurur.
    bilgiSeridi: (metin.match(/\d+ satır Depo'da tıkladığınız açık ihtiyaçtan dolduruldu/) || ["(yok)"])[0],
    // Hepsi silinebilir: alım ihtiyaçtan farklı olabilir (minimum sipariş adedi, bütçe).
    temizlemeVar: /Hepsini temizle/.test(metin),
    // BAŞKA ÜRÜN FİŞE GİRMEMELİ (kullanıcı, 12 Eylül: "sadece tıkladığım gelsin"). Kopça AYNI
    // tedarikçide ve MRP'de eksik — eskiden kendiliğinden fişe giriyordu.
    // KALEM SATIRLARINDAN ölçülüyor, sayfa metninden değil: "Kopça" ürün seçme listesinde de
    // geçiyor, `metin` üzerinden bakmak hep `false` verirdi (ölçmeyen ölçüm).
    ayniTedarikcininDigerEksigiGirmedi: !kalemSatirlari.some((r) => /Kopça/.test(r)),
    // SEMBOL KODA ÇEVRİLDİ: kalem USD olmalı ve "Kur eksik" uyarısı ÇIKMAMALI.
    kalemParaBirimleri,
    kurEksikUyarisiYok: !/Kur eksik/.test(metin),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
