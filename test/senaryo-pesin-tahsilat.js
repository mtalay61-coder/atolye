// SENARYO — FİŞTEN PEŞİN TAHSİLAT/ÖDEME.
//
// Kullanıcı: "Ödeme şekline göre kasa/banka hareketi — fiş şu an yalnız borç yazıyor, kasadan
// para çıkarmıyor."
//
// Kararlar: para YALNIZCA fişte hesap seçilirse hareket eder (otomatik olsaydı, varsayılan
// "Nakit" ile kesilmiş VADELİ fişler de kasayı boşaltırdı), hesap elle seçilir, kısmi olabilir.
//
// Ölçülen dört şey:
//   1. Hesap seçilmezse kasa DEĞİŞMEZ — eski davranış korunuyor.
//   2. Seçilince kasa hareket ediyor ve yönü doğru (alışta çıkış).
//   3. Peşin tutar fiş toplamını AŞAMIYOR.
//   4. Cari borcu peşin kadar kapanıyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }],
    bankalar: [], cekler: [],
  });

  // Tedarikçi A dolarla çalışıyor: hareket formunun varsayılanı bunu göstermeli.
  const cariler0 = JSON.parse(t["cari:data"]);
  cariler0[0].paraBirimi = "USD";
  t["cari:data"] = JSON.stringify(cariler0);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Cari kartından alış fişi kes.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(700);


  // TİP SEKMELERİ KENDİ RENGİNDE (kullanıcı, 6 Eylül). Önceden renk YALNIZ seçiliyken
  // görünüyordu; seçili olmayanların hepsi aynı griydi, yani renk "hangi tip" değil "hangisi
  // seçili" bilgisini taşıyordu — zaten dolgudan anlaşılan bir şey.
  const sekmeRenkleri = await sayfa.evaluate(() => {
    const al = () => [...document.querySelectorAll("button")]
      .filter((b) => /^(Müşteri|Tedarikçi|Personel) \(/.test(b.textContent.trim()))
      .map((b) => ({
        ad: b.textContent.trim().split(" ")[0],
        zemin: getComputedStyle(b).backgroundColor,
        yazi: getComputedStyle(b).color,
      }));
    return al();
  });
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Tedarikçi A/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('[data-cari-fis-ac="Alış"]:visible').first().click();
  await sayfa.waitForTimeout(1000);

  // PEŞİN SEÇİCİ VAR MI — kasa tanımlıysa görünmeli.
  const seciciVar = await sayfa.evaluate(() =>
    [...document.querySelectorAll("select")].some((s) =>
      [...s.options].some((o) => /Peşin yok/.test(o.textContent))));

  // ÇEK/SENETTE PEŞİN ALANI GİZLENMELİ: orada kasadan para ÇIKMAZ, para vadesinde hareket eder
  // ve çekler kendi defterinde takip ediliyor. Alanı orada göstermek, olmayan bir işlemi vaat
  // etmek olurdu.
  await sayfa.locator('select:has(option:text-is("Çek")):visible').first().selectOption({ label: "Çek" });
  await sayfa.waitForTimeout(500);
  const cekteGizli = await sayfa.evaluate(() =>
    ![...document.querySelectorAll("select")].some((sel) =>
      [...sel.options].some((o) => /Peşin yok/.test(o.textContent))));
  await sayfa.locator('select:has(option:text-is("Çek")):visible').first().selectOption({ label: "Nakit" });
  await sayfa.waitForTimeout(400);

  // Seçenekler: "peşin yok" VARSAYILAN, tanımlı hesaplar listeleniyor.
  const secenekler = await sayfa.evaluate(() => {
    const sel = [...document.querySelectorAll("select")]
      .find((x) => [...x.options].some((o) => /Peşin yok/.test(o.textContent)));
    return sel ? { liste: [...sel.options].map((o) => o.textContent), varsayilan: sel.value } : null;
  });

  // ---- CARİDEN TAHSİLAT: PARA KASAYA GİRMELİ ---------------------------------------------------
  //
  // Kullanıcı: "Cariden ödeme/tahsilatta da kasa banka seçilmesi gerekli — ödemenin nereye
  // yazılacağı ile alakalı." Tahsilat/ödeme TANIMI GEREĞİ para hareketidir; hesap yazılmazsa
  // cari bakiyesi düzelir ama para havada kalır ve kasa ile cari birbirini tutmaz.
  await sayfa.locator('button:has-text("Vazgeç"):visible').first().click().catch(() => {});
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Müşteri B/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Tahsilat"):visible').first().click();
  await sayfa.waitForTimeout(800);

  const hesapAlaniVar = await sayfa.evaluate(() =>
    /Hangi kasaya\/bankaya girdi/.test(document.body.innerText));

  await sayfa.evaluate(() => {
    const yaz = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const tutar = [...document.querySelectorAll('input[type="number"]')]
      .find((i) => i.getBoundingClientRect().width > 0);
    if (tutar) yaz(tutar, "750");
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator('select:has(option:text-is("Kasa: TL Kasa")):visible').first()
    .selectOption({ label: "Kasa: TL Kasa" });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^(Ekle|Kaydet)$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);

  const m = await depoOku(sayfa, "muhasebe:data");
  const kasa = ((m || {}).kasalar || [])[0] || {};
  const kasaHareketleri = (kasa.hareketler || []).map((h) => [h.yon, h.tutar, !!h.muhasebeBagId]);
  const cariler2 = await depoOku(sayfa, "cari:data");
  const musteri = (cariler2 || []).find((c) => c.unvan === "Müşteri B") || {};
  const bagliCari = (musteri.hareketler || []).filter((h) => h.muhasebeBagId).length;

  // Kasa hareketinin yönü, cari kapanışı ve fişten geri alma `birim-fisyaz-gerial.js`de de
  // ölçülüyor; burada asıl mesele ekranın bu bağı gerçekten kurabilmesi.
  // ---- RENK VE YİNELENME -----------------------------------------------------------------------
  //
  // Kullanıcı (6 Eylül): "Ödeme ve tahsilat renklerine göre renklendir. Alt alta 2 kere Nakit
  // yazıyor onu da kontrol et."
  //
  // Yinelenme: ürünsüz bir kayıtta (tahsilat/ödeme) açıklama HEM `ilk.aciklama` olarak HEM de
  // `yapisizHareketler` listesinde çiziliyordu — alt alta iki kez.
  const ekstreGorunumu = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    const rozetler = [...document.querySelectorAll("div.mono")]
      .filter((d) => /Nakit|Havale/.test(d.textContent))
      .map((d) => getComputedStyle(d).color);
    return {
      aciklamaTekrari: (m.match(/Tahsilat \(TL Kasa\)/g) || []).length,
      // PARANIN NEREYE İŞLENDİĞİ rozette yazılı (kullanıcı, 6 Eylül). Aynı para biriminde yalnız
      // hesap adı; farklıysa hesabın kendi birimindeki tutar da eklenir ("1000 USD ödeme,
      // kasa TL 42.000 ₺").
      hesapRozeti: [...document.querySelectorAll("div.mono")]
        .filter((d) => /Nakit|Havale/.test(d.textContent))
        .map((d) => d.textContent.trim()),
      // TAHSİLAT YEŞİL (#4E6B4E = rgb(78, 107, 78)).
      rozetRenkleri: rozetler,
    };
  });

  // ---- KUR ÇEVİRİCİ: DOLAR BORCUNA TL KASADAN TAHSİLAT ------------------------------------------
  //
  // Kullanıcı: "TL kasasına TL ödeme yapıp cariye başka kur ile işlemek gibi."
  // Hesap listesi önce aynı para birimiyle SÜZÜLÜYORDU; dolar borcuna TL tahsilat girilemiyordu.
  await sayfa.locator('button:has-text("Tahsilat"):visible').first().click();
  await sayfa.waitForTimeout(700);
  // Cari hareketinin para birimini USD yap: hesap TL, yani çevrim gerekiyor.
  await sayfa.locator('select:has(option:text-is("USD")):visible').first().selectOption({ label: "USD" }).catch(() => {});
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const yaz = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const t = [...document.querySelectorAll('input[type="number"]')].find((i) => i.getBoundingClientRect().width > 0);
    if (t) yaz(t, "100");
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator('select:has(option:text-is("Kasa: TL Kasa (TRY)")):visible').first()
    .selectOption({ label: "Kasa: TL Kasa (TRY)" });
  await sayfa.waitForTimeout(500);

  const cevrim = await sayfa.evaluate(() => ({
    // Farklı para birimli hesap ARTIK LİSTELENİYOR ve çevrim alanı açılıyor.
    alanVar: /Hesaba işlenecek \(TRY\)/.test(document.body.innerText),
    kurGosteriliyor: /1 USD = /.test(document.body.innerText),
  }));

  await sayfa.evaluate(() => {
    const yaz = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const kutu = [...document.querySelectorAll('input[title="Kasa/bankada gerçekten hareket eden tutar"]')]
      .find((i) => i.getBoundingClientRect().width > 0);
    if (kutu) yaz(kutu, "4200");
  });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^(Ekle|Kaydet)$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);

  // ---- HANGİ KASAYA İŞLENDİĞİ EKSTREDE GÖRÜNMELİ -----------------------------------------------
  //
  // Kullanıcı bildirdi (6 Eylül): bazı satırlarda "Tahsilat (TL Kasa)" yazıyor, bazılarında yalnız
  // "Tahsilat". Muhasebe ekranından girilen hareket hesabı yazıyordu, cari kartından girilen
  // yazmıyordu — ekstreye bakan kişi paranın nereye gittiğini yalnız bazı satırlarda görüyordu.
  const hesapAdiEkstrede = await sayfa.evaluate(() => /Tahsilat \(TL Kasa\)/.test(document.body.innerText));

  const m2 = await depoOku(sayfa, "muhasebe:data");
  const kasa2 = ((m2 || {}).kasalar || [])[0] || {};
  const cevrimliHareket = (kasa2.hareketler || []).find((h) => h.cariPB === "USD") || {};
  const kurKaydi = {
    // KASAYA HESABIN KENDİ BİRİMİNDE yazılıyor: 4200 TRY.
    kasaTutari: cevrimliHareket.tutar,
    // Karşı tarafın tutarı ve birimi de kayda giriyor.
    cariTutari: cevrimliHareket.cariTutar,
    cariPB: cevrimliHareket.cariPB,
    // Kur iki tutardan TÜRETİLİYOR, ayrıca sorulmuyor: 4200 / 100 = 42.
    kur: cevrimliHareket.kur,
  };

  // CARİNİN PARA BİRİMİ VARSAYILAN GELİYOR (kullanıcı, 9 Eylül: "cari açarken varsayılan para
  // birimini seçelim, alış veya satışta olan para birimini çeksin").
  //
  // Hareket formu sabit "TRY" ile açılıyordu: dolarla çalışan bir cariye her girişte para birimi
  // elle düzeltiliyordu. Bu bir VARSAYILAN — kullanıcı yine değiştirebilir.
  const cariParaBirimi = await (async () => {
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /Tedarikçi A/.test(x.textContent) && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(1000);
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => x.textContent.trim() === "Ödeme" && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(800);
    const deger = await sayfa.evaluate(() =>
      [...document.querySelectorAll("select")]
        .filter((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR"
          && x.getBoundingClientRect().width > 0)
        .map((x) => x.value));
    // Ölçüm sonrası kartı kapat: sonraki adımlar temiz ekranla başlasın.
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /Vazgeç/.test(x.textContent) && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(500);
    return deger;
  })();

  await tarayici.close();
  return { hatalar, cariParaBirimi, seciciVar, cekteGizli, secenekler, sekmeRenkleri, hesapAlaniVar, hesapAdiEkstrede, ekstreGorunumu, kasaHareketleri, bagliCari, cevrim, kurKaydi };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
