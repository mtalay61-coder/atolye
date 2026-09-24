// SENARYO — KAYDEDİLMİŞ SİPARİŞİ DÜZENLEME.
//
// Kullanıcı (6 Eylül): "Kaydedilmiş siparişi düzenlemek yok, düzenleme ekleyelim."
//
// Asıl mesele düzenlemeyi eklemek değil, KAPILARI doğru koymak. Sipariş tek başına duran bir
// kayıt değil: karşılanan miktar fişten geliyor, planlama üretim/alış siparişine bağlı. Bunlardan
// biri varken kalemi değiştirmek, karşı taraftaki kaydı sessizce yalancı çıkarır.
//
// Ölçülen üç şey:
//   1. TEMİZ kalemin miktarı değiştirilebiliyor ve kayda geçiyor.
//   2. KARŞILANMIŞ kalem düzenlenemiyor (giriş kutusu hiç çizilmiyor).
//   3. Başlık (tarih, müşteri kodu, not) düzenlenebiliyor; teslimat yapılmışsa CARİ kilitli.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([
    {
      id: "sd1", siparisNo: "SAT-D1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
      tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "ilk not", musteriKodu: "",
      kalemler: [
        // TEMİZ kalem — düzenlenebilmeli.
        { id: "kd1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" },
        // KARŞILANMIŞ kalem — kilitli olmalı.
        { id: "kd2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 4, karsilanan: 2, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" },
        // TAMAMEN TEMİZ renk grubu — fiyat kutusu YALNIZ burada çıkmalı.
        { id: "kd3", urunId: "u2", urunAd: "Bot", renk: "Taba", beden: "40", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 350, paraBirimi: "TRY" },
      ],
    },
  ]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await sayfa.getByRole("button", { name: "Sipariş", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  // Durum süzgeci varsayılan "Bekliyor"; sipariş "Onaylandı" olduğu için önce "Tümü" seçiliyor.
  // "Tümü" birden çok ekranda geçiyor, o yüzden GÖRÜNÜR olanı ve sayaç ekiyle olanı seçiyoruz.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  // Sipariş özet satırı: metniyle değil GÖRÜNÜRLÜĞÜYLE seçiliyor — "SAT-D1" birçok ata ögenin
  // metninde geçiyor ve `.last()` görünmeyen bir sarmalayıcıya düşüyordu.
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")]
      .filter((x) => x.textContent.includes("SAT-D1") && x.getBoundingClientRect().width > 0)
      .pop();
    if (d) d.click();
  });
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(800);

  // 0. DÜZENLEME MODU DIŞINDA KUTU YOK (kullanıcı, 12 Eylül: "düzelt tuşuna tıklamadan düzeltmeye
  //    izin vermesin"). Miktar/fiyat kutuları ve kalem silme çarpısı yalnız ✎ ile açılan modda.
  const modDisiKutu = await sayfa.evaluate(() => ({
    miktar: document.querySelectorAll('input[title^="Sipariş miktarı"]').length,
    fiyat: document.querySelectorAll('input[title^="Birim fiyat"]').length,
    sil: [...document.querySelectorAll('button[title="Bu kalemi sil"]')].length,
  }));
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => (x.getAttribute("title") || "").startsWith("Düzenle") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);

  // 1 + 2. Miktar kutuları: yalnız TEMİZ kalem için çizilmeli (düzenleme modunda).
  const kutular = await sayfa.evaluate(() =>
    [...document.querySelectorAll('input[title^="Sipariş miktarı"]')].map((i) => i.value));

  // Temiz kalemin miktarını 5 → 8 yap.
  const kutu = sayfa.locator('input[title^="Sipariş miktarı"]:visible').first();
  await kutu.fill("8");
  await kutu.press("Enter");
  await sayfa.waitForTimeout(900);

  const sipSonrasi = await depoOku(sayfa, "siparis:data");
  const sip = (sipSonrasi || []).find((x) => x.id === "sd1") || {};
  const kalemler = (sip.kalemler || []).map((k) => [k.id, k.miktar]);

  // 3. Başlık düzenleme.
  // EYLEMLER BAŞLIKTAKİ ŞERİTTE, İKON OLARAK (v1.203.0): metin yerine `title` ile bulunuyor.
  // Kullanıcı (7 Eylül) eylemlerin tek yerde ve ikon olmasını istedi; senaryo da metne değil
  // ANLAMA bağlanmalı, yoksa her görsel değişiklikte kırılır.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);

  const cariKilidi = await sayfa.evaluate(() =>
    /teslimat yapılmış, değiştirilemez/.test(document.body.innerText));

  await sayfa.locator('input[type="date"]:visible').last().fill("2026-10-15");
  await sayfa.waitForTimeout(200);
  const kodKutusu = sayfa.locator('input:visible').nth(0);
  await sayfa.evaluate(() => {
    const t2 = [...document.querySelectorAll("textarea")].pop();
    if (t2) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(t2, "düzeltilmiş not");
      t2.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Kaydet"):visible').first().click();
  await sayfa.waitForTimeout(1000);

  const sipSon = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sd1") || {};

  // ---- BİRİM FİYAT DÜZENLEME -------------------------------------------------------------------
  // Yalnız TEMİZ ve tek fiyatlı renk grubunda kutu çizilmeli. Bu siparişte "Siyah" grubunda biri
  // karşılanmış iki kalem var, yani kutu ÇIKMAMALI — karışık kilit durumunda tek kutu, kilitli
  // satırı da değiştirecekmiş gibi görünürdü.
  // Başlık kaydedilince düzenleme modu kapandı; fiyat için yeniden ✎.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);
  const fiyatKutulari = await sayfa.evaluate(() =>
    [...document.querySelectorAll('input[title^="Birim fiyat"]')].map((i) => i.value));

  // Temiz gruptaki fiyatı 350 → 375 yap; o rengin BÜTÜN ölçülerine uygulanmalı.
  const fiyatKutusu = sayfa.locator('input[title^="Birim fiyat"]:visible').first();
  await fiyatKutusu.fill("375");
  await fiyatKutusu.press("Enter");
  await sayfa.waitForTimeout(900);
  const fiyatSonrasi = ((await depoOku(sayfa, "siparis:data")) || [])
    .find((x) => x.id === "sd1").kalemler.map((k) => [k.id, k.birimFiyat]);

  // ---- VAR OLAN SİPARİŞE KALEM EKLEME ----------------------------------------------------------
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Bu siparişe yeni kalem ekle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(900);
  const eklemeModu = await sayfa.evaluate(() => ({
    baslikVar: /SAT-D1 siparişine kalem ekleniyor/.test(document.body.innerText),
    // Düğmenin adı da değişmeli: "Siparişi Kaydet"e basıp var olana eklendiğini fark etmek
    // geri alınması zahmetli bir sürpriz olurdu.
    dugmeAdi: [...document.querySelectorAll("button")].some((b) => /SAT-D1 Siparişine Ekle/.test(b.textContent)),
  }));

  // DURUM ARTIK SEÇİLMİYOR, GÖSTERİLİYOR (kullanıcı, 7 Eylül: "sipariş durumu manuel kaldıralım,
  // gerek yok çünkü sipariş hareketi ile durum belirleniyor").
  //
  // Elle seçim hareketlerin hesapladığı durumla ÇELİŞEBİLİYORDU: "Tamamlandı" seçilse de teslim
  // edilmemiş kalem duruyorsa liste onu bekleyen sayıyordu. İki kaynak varsa biri yalan söyler.
  const durumGosterimi = await sayfa.evaluate(() => ({
    // Açılır liste KALMAMALI.
    seciciVar: [...document.querySelectorAll("select")]
      .some((x) => [...x.options].some((o) => /Kısmi Teslim/.test(o.textContent))),
    // Rozet olarak duruyor ve neye dayandığı ipucunda yazılı.
    rozet: (() => {
      const r = [...document.querySelectorAll("span")]
        .find((x) => /hareketlerinden hesaplan/.test(x.title || ""));
      return r ? r.textContent.trim() : null;
    })(),
  }));


  await tarayici.close();
  return {
    modDisiKutu,
    durumGosterimi,
    hatalar,
    // Kutu SAYISI önemli: karışık kilitli "Siyah" grubunda çıkmamalı, temiz "Taba"da çıkmalı.
    fiyatKutulari,
    fiyatSonrasi,
    eklemeModu,
    // İki kalem var ama YALNIZ BİRİ düzenlenebilir.
    duzenlenebilirKalemSayisi: kutular.length,
    kalemler,
    cariKilidi,
    baslik: { teslimTarihi: sipSon.teslimTarihi, not: sipSon.not },
    // Kilitli kalem DEĞİŞMEMİŞ olmalı.
    kilitliKalemKorundu: ((sipSon.kalemler || []).find((k) => k.id === "kd2") || {}).miktar === 4,
    // Cari de değişmemiş olmalı.
    cariKorundu: sipSon.cariId === "c2",
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
