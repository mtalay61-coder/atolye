// SENARYO — PAKETLEME: KOLİ KURMA VE SİLME.
//
// Kullanıcı: "Müşteri koli bazında sipariş veriyor, koli içi genelde asortili. Bazen kırık asorti,
// koli içine başka stok da koyabiliyoruz — aynı kolide X ve Y ürünü olabilir."
//
// KOLİ YENİ BİR DEFTER → notun başındaki değişmez kural: yazma, silme, çöp ve SİLME TESTİ birlikte.
// Bu senaryo "eklendi mi"nin yanında "silinince gitti mi"yi de ölçüyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // 1x1 saydam PNG: görselin etikete ve listeye GİRDİĞİ ölçülüyor, nasıl göründüğü değil.
  const GORSEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  // Tanımlar tohumda dar: Siyah/Taba ve 40/41/42. Barkod tanımlı renk+ölçü kodundan kurulduğu
  // için, kolinin ürünü TANIMLI değerler kullanmalı — yoksa etikette barkod çıkmaz. Bu senaryo
  // ikisini birden ölçüyor: tanımlı olan barkod alıyor, tanımsız olan sebebiyle bildiriliyor.
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.renkler = [...tan.renkler, { id: "r-bej", ad: "Bej" }];
  tan.bedenler = [...tan.bedenler, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }];
  t["tanimlar:data"] = JSON.stringify(tan);

  const stok = JSON.parse(t["stok:items"]);
  // Koliye giren ürünün rengine görsel: etiketin görseli RENKTEN aldığı böyle sınanıyor.
  stok.find((u) => u.ad === "Bot").renkResimleri = { Siyah: GORSEL };
  stok.push(
    { id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Bej", beden: "37", miktar: 20 }, { renk: "Bej", beden: "38", miktar: 20 }],
      renkResimleri: { Bej: GORSEL }, hareketler: [], recete: [], birimFiyat: 465 },
    { id: "m2", ad: "SS Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Beyaz", beden: "37", miktar: 20 }], hareketler: [], recete: [], birimFiyat: 520 },
  );
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "sp1", siparisNo: "SAT-P1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: [
      { id: "pk1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "pk2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);

  // KOD EKSİĞİ UYARISI VE TOPLU KOD ATAMA.
  //
  // Kod artık varyantın üstünde saklanmıyor; barkod üç KALICI koddan kuruluyor
  // (stok no + renk kodu + ölçü kodu). Bu yüzden "barkodsuz varyant" saymak yerine üç kod
  // ailesinin de dolduğu ölçülüyor — eksik olan hangisi olursa olsun etiket basılamaz.
  const uyariVar = await sayfa.evaluate(() => /çift barkodu kurulamıyor/.test(document.body.innerText));
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);
  const stokSonrasi = await depoOku(sayfa, "stok:items");
  const tanimSonrasi = await depoOku(sayfa, "tanimlar:data");
  const kodDurumu = {
    stokNosuzUrun: (stokSonrasi || []).filter((u) => !u.stokNo).length,
    kodsuzRenk: ((tanimSonrasi || {}).renkler || []).filter((r) => !r.barkodKodu).length,
    kodsuzOlcu: ((tanimSonrasi || {}).bedenler || []).filter((b) => !b.barkodKodu).length,
    // Stok noları BENZERSİZ olmalı: aynı numara iki ürüne düşerse basılmış etiket yanlış malı gösterir.
    stokNoBenzersiz: new Set((stokSonrasi || []).map((u) => u.stokNo)).size === (stokSonrasi || []).length,
    // "SS Model" beyaz rengi TANIMSIZ: uyarı kalkmamalı ve sebebi ADIYLA yazmalı. Sebebi
    // yazmayan bir uyarı, kullanıcıyı eksiği aramaya bırakır.
    tanimsizSebebiYazili: await sayfa.evaluate(() =>
      /Tanımlar'da yok/.test(document.body.innerText) && /renk: Beyaz/.test(document.body.innerText)),
  };

  await sayfa.locator("[data-yeni-koli]:visible").click();
  await sayfa.waitForTimeout(500);

  // KAYNAK SEÇİLMEDEN ÜRÜN LİSTESİ AÇILMAMALI: personel ekranı boş stok listesiyle karşılaşmasın.
  const kaynaksiz = await sayfa.evaluate(() => ({
    urunKutusuVar: document.querySelectorAll('input[title="Koliye eklenecek adet"]').length,
    yonlendirmeVar: /Sipariş ya da üretim seçin/.test(document.body.innerText),
  }));

  // SİPARİŞ NO OKUTMA: personelin hangi numaranın nereye yazılacağını bilmesi gerekmiyor.
  await sayfa.locator('input[title="Sipariş / üretim no"]:visible').fill("SAT-P1");
  await sayfa.locator("[data-kaynak-getir]:visible").click();
  await sayfa.waitForTimeout(600);
  const okutmaSonrasi = await sayfa.evaluate(() => {
    const t = document.body.innerText;
    return {
      mesaj: /SAT-P1 getirildi/.test(t),
      // YALNIZCA siparişteki ürün/renk görünmeli; stoktaki diğerleri değil.
      siparistekiUrunVar: /125 Model/.test(t),
      siparisteOlmayanGizli: !/SS Model/.test(t),
      kutuSayisi: [...document.querySelectorAll('input[title="Koliye eklenecek adet"]')].filter((i) => i.getBoundingClientRect().width > 0).length,
    };
  });

  // "Kalanı doldur": tek tıkla siparişin kalanları kutulara yazılıyor.
  await sayfa.locator('button:has-text("Kalanı doldur"):visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-koli-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(1500);

  const koliler = await depoOku(sayfa, "koli:data");
  const koli = (koliler || [])[0] || {};

  // ETİKET YAZDIRMA — barkod yazıcısı için sayfa başına BİR etiket.
  // Yazdırma penceresi otomasyonla açılamıyor; onun yerine yazdırma çerçevesinin İÇERİĞİ ölçülüyor:
  // kaç sayfa üretildiği ve @page boyutları. Kullanıcı 8 çift için 8 sayfa istedi.
  await sayfa.evaluate(() => { window.print = () => {}; });   // gerçek yazdırma iletişimini açma
  await sayfa.locator('button:has-text("Kutu Etiketleri"):visible').first().click();
  await sayfa.waitForTimeout(700);
  const kutuEtiket = await sayfa.evaluate(() => {
    const cerceve = [...document.querySelectorAll("iframe")].pop();
    if (!cerceve) return null;
    const d = cerceve.contentWindow.document;
    const stil = d.querySelector("style").textContent;
    const sayfalar = d.querySelectorAll(".etiket");
    return {
      sayfaSayisi: sayfalar.length,
      boyut: (stil.match(/@page \{ size: ([^;]+);/) || [])[1],
      // Son etikette sayfa sonu OLMAMALI: yazıcıya fazladan boş etiket besletirdi.
      sonEtikettePageBreak: sayfalar[sayfalar.length - 1].getAttribute("style") || "",
      barkodVar: d.querySelectorAll("svg").length,
      gorselVar: d.querySelectorAll("img").length,
    };
  });
  await sayfa.waitForTimeout(1800);

  await sayfa.locator('button:has-text("Koli Etiketi"):visible').first().click();
  await sayfa.waitForTimeout(700);
  const koliEtiket = await sayfa.evaluate(() => {
    const cerceve = [...document.querySelectorAll("iframe")].pop();
    if (!cerceve) return null;
    const d = cerceve.contentWindow.document;
    return {
      sayfaSayisi: d.querySelectorAll(".etiket").length,
      boyut: (d.querySelector("style").textContent.match(/@page \{ size: ([^;]+);/) || [])[1],
      icerikSatiri: d.querySelectorAll("tbody tr").length,
      musteriYazili: /Müşteri B/.test(d.body.innerText),
      gorselVar: d.querySelectorAll("img").length,
      // Matris başlığında beden sütunları olmalı (düz liste değil).
      bedenSutunlari: [...d.querySelectorAll("thead th")].map((x) => x.textContent.trim()).filter(Boolean),
    };
  });
  await sayfa.waitForTimeout(1800);

  // SINIR DENETİMİ — aynı siparişten ikinci koli.
  //
  // Kullanıcı aynı siparişten üç kez 8'lik koli kurdu ve uygulama hiçbir şey demedi. Sipariş 8
  // çiftlikti, kolilerde 24 çift birikti. Artık hazır kolilerdeki adetler de "kalan"dan düşülüyor.
  await sayfa.locator("[data-yeni-koli]:visible").click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('input[title="Sipariş / üretim no"]:visible').fill("SAT-P1");
  await sayfa.locator("[data-kaynak-getir]:visible").click();
  await sayfa.waitForTimeout(700);
  const ikinciKoli = await sayfa.evaluate(() => ({
    // İlk koli siparişin tamamını aldığı için ikinci koli kurulurken hiç kalem kalmamalı.
    kalanKutuSayisi: [...document.querySelectorAll('input[title="Koliye eklenecek adet"]')].filter((i) => i.getBoundingClientRect().width > 0).length,
    mesaj: /paketlenecek kalem kalmadı/.test(document.body.innerText),
  }));

  // TÜM ADETLERİ ASORTİLE (19 Eylül): asorti seçilip düğmeye basılınca kalan adetler tam setlere
  // bölünüyor, artan boşta kalıyor.
  // Tohumda asorti tanımı yok, o yüzden asorti kontrolü hiç çizilmiyor — doğru davranış:
  // asorti tanımlı değilken "tüm adetleri asortile" düğmesi de görünmemeli.
  const asortiDugmesi = await sayfa.evaluate(() => document.querySelectorAll("[data-tumunu-asortile]").length > 0);
  await sayfa.locator('button:has-text("Vazgeç"):visible').last().click();
  await sayfa.waitForTimeout(400);

  // SİLME TESTİ
  // SilOnayButonu iki aşamalı: ilk tıklama uyarıya çevirir, ikincisi siler.
  const silDugmesi = sayfa.locator('button[title="Sil"]:visible').last();
  await silDugmesi.click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül).
  await sayfa.locator('[data-sil-onayla]').first().click();
  await sayfa.waitForTimeout(1200);
  const silmeSonrasi = await depoOku(sayfa, "koli:data");
  const cop = await depoOku(sayfa, "cop:data");

  await tarayici.close();
  return {
    asortiDugmesi,
    hatalar,
    barkodsuzUyarisi: uyariVar,
    kaynaksiz,
    okutmaSonrasi,
    kodDurumu,
    koli: {
      kodBicimi: /^K-\d{4}\d{3}$/.test(koli.kod || ""),
      durum: koli.durum,
      kalemSayisi: (koli.kalemler || []).length,
      toplamAdet: (koli.kalemler || []).reduce((t2, x) => t2 + x.adet, 0),
      farkliUrunSayisi: new Set((koli.kalemler || []).map((x) => x.urunId)).size,
      kullaniciYazildi: !!koli.kullanici,
    },
    ikinciKoli,
    kutuEtiket,
    koliEtiket,
    silmeSonrasiKoliSayisi: (silmeSonrasi || []).length,
    copaDustuMu: (cop || []).some((c) => c.tur === "koli"),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
