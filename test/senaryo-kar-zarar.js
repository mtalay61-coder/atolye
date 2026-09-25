// SENARYO — KÂR / ZARAR (kullanıcı, 17 Eylül: "kârlılığımızı kontrol edecek... kartlar olması
// gerekli"). Gelir/gider kartları v1.322.0'da kuruldu; bu ekran onların meyvesi.
//
// Hesap sırası muhasebenin gelir tablosu sırası:
//   satış geliri − satılan malın maliyeti = brüt kâr − giderler + diğer gelir = net kâr
//
// Ölçülen: (1) rakamlar doğru toplanıyor; (2) gider dökümü gruplara ayrılıyor ve kart adları
// görünüyor; (3) dönem süzgeci çalışıyor (geçen ayda bu ayın hareketleri yok); (4) gider kartı
// tanımlı değilse uyarı çıkıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const BUGUN = new Date().toISOString().slice(0, 10);

function tohum({ kartsiz } = {}) {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  if (!kartsiz) {
    tan.giderKartlari = [
      { id: "gk1", ad: "İşyeri kirası", grup: "yonetim", tur: "gider", tdhp: "770.03" },
      { id: "gk2", ad: "Personel ücretleri", grup: "uretim", tur: "gider", tdhp: "730" },
    ];
  }
  t["tanimlar:data"] = JSON.stringify(tan);

  // Satış: 10 çift × 900 ₺ = 9.000 gelir; kart alış fiyatı 400 → 4.000 maliyet.
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.alisFiyati = 400;
  bot.hareketler = [...(bot.hareketler || []),
    { id: "hs1", tarih: BUGUN, renk: "Siyah", beden: "41", miktar: -10, kaynak: "Satış", birimFiyat: 900, paraBirimi: "TRY", fisNo: "SF-0918001" }];
  t["stok:items"] = JSON.stringify(st);

  // Gider: 12.000 kira (genel yönetim) + 8.000 personel (üretim).
  // ÜRETİM İŞÇİLİĞİ (20 Eylül): `-İşçilik` fişli cari borcu, malın maliyetine girer.
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c3" || c.tip === "Personel")
    ? { ...c, hareketler: [{ id: "hi1", tarih: BUGUN, yon: "Borç", tutar: 1500, paraBirimi: "TRY",
        fisNo: "10001-Kesim-İşçilik", aciklama: "Kesim işçilik ücreti", defter: "Genel" }] }
    : c));
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: kartsiz ? [] : [
      { id: "m1", tarih: BUGUN, yon: "Çıkış", tutar: 12000, giderKartId: "gk1", giderKartAd: "İşyeri kirası", giderGrubu: "yonetim", defter: "Genel" },
      { id: "m2", tarih: BUGUN, yon: "Çıkış", tutar: 8000, giderKartId: "gk2", giderKartAd: "Personel ücretleri", giderGrubu: "uretim", defter: "Genel" },
    ] }],
  });
  return t;
}

async function panelAc(sayfa) {
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Kâr \/ Zarar/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
}
const satirlar = (sayfa) => sayfa.evaluate(() => {
  const m = document.body.innerText.replace(/\n/g, " | ");
  const al = (etiket) => { const i = m.indexOf(etiket); return i < 0 ? null : m.slice(i, i + 60).split("|")[1].trim(); };
  return {
    satisGeliri: al("Satış geliri"),
    iscilik: al("− Üretim işçiliği"),
    maliyet: al("− Satılan malın maliyeti"),
    brutKar: al("= Brüt kâr"),
    giderler: al("− Giderler"),
    netKar: al("= NET KÂR"),
  };
});

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  await panelAc(sayfa);

  const buAy = await satirlar(sayfa);
  const dokum = await sayfa.evaluate(() => ({
    gruplar: [...document.querySelectorAll("[data-kz-grup]")].map((e) => e.getAttribute("data-kz-grup")),
    kartAdlariGorunuyor: /İşyeri kirası/.test(document.body.innerText) && /Personel ücretleri/.test(document.body.innerText),
  }));

  // Geçen ay: bu ayın hareketleri hesaba girmemeli.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-kz-donem="gecenAy"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const gecenAy = await satirlar(sayfa);
  await tarayici.close();

  // Gider kartı yokken uyarı.
  const ikinci = await uygulamaAc(tohum({ kartsiz: true }), { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  await panelAc(ikinci.sayfa);
  const kartsizUyari = await ikinci.sayfa.evaluate(() => /Gider kartı tanımlı değil/.test(document.body.innerText));
  await ikinci.tarayici.close();

  return { hatalar, buAy, dokum, gecenAy, kartsizUyari };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
