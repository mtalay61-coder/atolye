// SENARYO — ÇEK BAĞI GERİ ALMA KAPISINDA (kullanıcı, 10 Eylül: "çek bağını kapat").
//
// Çek bir defter; değişmez kural gereği SİLİNİNCE GİTTİ Mİ ölçülür, eklendi mi değil.
// Ölçülen yol kullanıcının yolu: Fişler ekranı, cari ekstresi, çek listesi.
//
//   A. İşlem görmüş (ciro edilmiş) çekin GİRİŞ fişi Fişler'de kilitli, ekstrede kilitli; kilit
//      ne yapılacağını söylüyor.
//   B. CİRO fişi silinince çek portföye dönüyor, geçmişe "Ciro geri alındı" ekleniyor.
//   C. Kilit kalkıyor: giriş fişi artık silinebilir.
//   D. Çek listesinden silinen çek, DOĞDUĞU tahsilat hareketini de götürüyor — hem cirosu geri
//      alınmış çekte hem hiç işlem görmemiş çekte.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const gorunur = "(e) => e.getBoundingClientRect().width > 0";

// İŞLEMLER MENÜSÜ (18 Eylül): fiş kartındaki bağlantı/sil düğmeleri artık tek düğmenin arkasında.
async function fisIslemleriniAc(sayfa) {
  // İŞLEMLER MENÜSÜ (18 Eylül): bağlantı ve silme düğmeleri bu menünün içinde. Düğme toggle
  // olduğu için açıkken dokunulmuyor. `evaluate` içindeki `click()` React dinleyicisine
  // ulaşmadığı için Playwright tıklaması kullanılıyor.
  const acik = await sayfa.evaluate(() =>
    [...document.querySelectorAll('[data-fis-islem-menusu="acik"]')].some((x) => x.offsetParent));
  if (acik) return;
  const dugme = sayfa.locator("[data-fis-islemler]:visible").first();
  if (await dugme.count()) {
    await dugme.click();
    await sayfa.waitForTimeout(400);
  }
}

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => {
    if (c.unvan === "Müşteri B") {
      return { ...c, hareketler: [
        { id: "h-giris", tarih: "2026-09-10", zaman: "2026-09-10T09:00:00.000Z", yon: "Alacak", tutar: 42000,
          paraBirimi: "TRY", odemeSekli: "Çek", islemTipi: "Tahsilat", fisNo: "THS-20260910-001",
          aciklama: "Müşteri çeki · No 12345", defter: "Genel" },
        { id: "h-giris2", tarih: "2026-09-10", zaman: "2026-09-10T09:05:00.000Z", yon: "Alacak", tutar: 5000,
          paraBirimi: "TRY", odemeSekli: "Çek", islemTipi: "Tahsilat", fisNo: "THS-20260910-002",
          aciklama: "Müşteri çeki · No 77777", defter: "Genel" },
      ] };
    }
    if (c.unvan === "Tedarikçi A") {
      return { ...c, hareketler: [
        { id: "h-ciro", tarih: "2026-09-10", zaman: "2026-09-10T10:00:00.000Z", yon: "Borç", tutar: 1000,
          paraBirimi: "USD", odemeSekli: "Çek", islemTipi: "Ödeme", fisNo: "ODM-20260910-001",
          aciklama: "Çek cirosu · No 12345", defter: "Genel", cekId: "cek-ciro" },
      ] };
    }
    return c;
  });
  t["cari:data"] = JSON.stringify(cariler);
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], bankalar: [], kurlar: { USD: 42, EUR: 56 },
    cekler: [
      { id: "cek-ciro", durum: "Ciro Edildi", tip: "Alınan", cekNo: "12345", cariId: "c2", tutar: 42000,
        paraBirimi: "TRY", vadeTarihi: "2026-12-01", banka: "Ziraat", hareketId: "h-giris",
        gecmis: [{ id: "cekh-1", islem: "Ciro Et", oncekiDurum: "Portföyde", yeniDurum: "Ciro Edildi",
          tarih: "2026-09-10", cariId: "c1", cariAd: "Tedarikçi A", tutar: 1000, paraBirimi: "USD",
          hareketId: "h-ciro", kullanici: "Test" }] },
      { id: "cek-temiz", durum: "Portföyde", tip: "Alınan", cekNo: "77777", cariId: "c2", tutar: 5000,
        paraBirimi: "TRY", vadeTarihi: "2026-12-15", banka: "Ziraat", hareketId: "h-giris2" },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  const fisAc = async (fisNo) => {
    await modulAc(sayfa, "Fişler");
    await sayfa.waitForTimeout(800);
    // Fiş satırı AÇ/KAPA düğmesi: aynı fişe ikinci kez gelindiğinde tıklama onu KAPATIYOR.
    // Açık olup olmadığı detay bölümünün metninden anlaşılıyor; kapandıysa bir kez daha tıklanıyor.
    // 18 Eylül: bağlantı metinleri "İşlemler" MENÜSÜNÜN İÇİNE girdi ve menü kapalıyken
    // `innerText`te görünmüyor — kart açık olduğu hâlde bu kontrol "kapalı" diyordu ve senaryo
    // ikinci kez tıklayıp kartı gerçekten kapatıyordu. Artık kartın açık olduğunu İŞLEMLER
    // DÜĞMESİNİN varlığından anlıyoruz; o düğme yalnız açık kartta render ediliyor.
    const acikMi = () => sayfa.evaluate(() =>
      [...document.querySelectorAll("[data-fis-islemler]")].some((x) => x.offsetParent));
    await sayfa.getByText(fisNo, { exact: true }).filter({ visible: true }).first().click();
    await sayfa.waitForTimeout(700);
    if (!(await acikMi())) {
      await sayfa.getByText(fisNo, { exact: true }).filter({ visible: true }).first().click();
      await sayfa.waitForTimeout(700);
    }
  };
  // İŞLEMLER MENÜSÜ (18 Eylül): sil düğmesi ve çek kilidi rozeti menünün içinde; ölçümden önce aç.
  const fisSilmeDurumu = async () => {
    await fisIslemleriniAc(sayfa);
    return sayfa.evaluate((g) => {
    const gor = eval(g);
    const rozet = [...document.querySelectorAll("[data-cek-kilidi]")].filter(gor)[0];
    return {
      kilitRozeti: !!rozet,
      silDugmesi: [...document.querySelectorAll("button")].filter(gor)
        .some((b) => /^(Sil|Bu Fişi Temizle)$/.test((b.textContent || "").trim())),
      kilitMesaji: rozet ? rozet.getAttribute("title") : null,
    };
    }, gorunur);
  };

  // ---- A. GİRİŞ FİŞİ KİLİTLİ ---------------------------------------------------------------------
  await fisAc("THS-20260910-001");
  const girisFisiOnce = await fisSilmeDurumu();
  // İşlem görmemiş çekin girişi kilitli DEĞİL (v1.80.0 davranışı: silinirse çek de gider).
  await fisAc("THS-20260910-002");
  const temizCekFisi = await fisSilmeDurumu();
  // Ciro fişinin kendisi kilitli DEĞİL: onu silmek ciroyu geri almanın yolu.
  await fisAc("ODM-20260910-001");
  const ciroFisi = await fisSilmeDurumu();

  // Ekstrede de: Müşteri B'nin iki çek satırından YALNIZ ciro edilenin girişi kilitli.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Müşteri B/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1000);
  // SATIR BAZINDA ölçülüyor: hangi ekstre satırında kilit, hangisinde silme düğmesi var.
  // Görünürlük süzgeci burada KULLANILMIYOR — kilit yalnız bir ikon taşıyor ve test derlemesinde
  // ikonlar boş öge olarak çizildiği için genişliği sıfır ölçülüyor (ilk ölçümde "0 kilit" çıktı,
  // oysa öge sayfadaydı). Satırın kendisi görünür mü diye ayrıca bakılıyor.
  const ekstreSatiri = (fisNo) => sayfa.evaluate((no) => {
    const tr = [...document.querySelectorAll("tr")]
      .find((x) => x.getBoundingClientRect().width > 0 && [...x.querySelectorAll("button, span, td")].some((e) => e.textContent.trim() === no));
    if (!tr) return null;
    return {
      kilit: !!tr.querySelector("[data-cek-kilidi]"),
      silDugmesi: !!tr.querySelector('button[title="Sil"]'),
      kilitMesaji: (tr.querySelector("[data-cek-kilidi]") || { getAttribute: () => null }).getAttribute("title"),
    };
  }, fisNo);
  const ekstreCiroluCek = await ekstreSatiri("THS-20260910-001");
  const ekstreTemizCek = await ekstreSatiri("THS-20260910-002");

  // ---- B. CİRO FİŞİ SİLİNİR → ÇEK PORTFÖYE DÖNER -------------------------------------------------
  await fisAc("ODM-20260910-001");
  await fisIslemleriniAc(sayfa);
  // Menüdeki silme düğmesi: bağlantısı olan fişte "Sil", yetim fişte "Bu Fişi Temizle".
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent
      && /^(Sil|Bu Fişi Temizle)$/.test((x.textContent || "").trim()));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-evet-temizle]:visible").first().click();
  await sayfa.waitForTimeout(1500);

  const m1 = await depoOku(sayfa, "muhasebe:data");
  const c1 = await depoOku(sayfa, "cari:data");
  const cek1 = (m1.cekler || []).find((c) => c.id === "cek-ciro") || {};
  const hareketSayisi = (cs, unvan) => ((cs.find((c) => c.unvan === unvan) || {}).hareketler || []).map((h) => h.id);
  const ciroSonrasi = {
    cekDurumu: cek1.durum,
    gecmis: (cek1.gecmis || []).map((g) => [g.islem, g.oncekiDurum, g.yeniDurum, g.geriAlinanSatirId || null]),
    tedarikciHareketleri: hareketSayisi(c1, "Tedarikçi A"),
    musteriHareketleri: hareketSayisi(c1, "Müşteri B"),
  };

  // ---- C. KİLİT KALKTI -----------------------------------------------------------------------------
  await fisAc("THS-20260910-001");
  const girisFisiSonra = await fisSilmeDurumu();

  // ---- D. ÇEK LİSTESİNDEN SİLME → BAĞLI TAHSİLAT DA GİDER -----------------------------------------
  await modulAc(sayfa, "Muhasebe");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Çek" && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(700);
  // Portföye dönen çekte işlemler yeniden açık: doğru cariye yeniden ciro edilebilir.
  const islemlerDugmesiSayisi = await sayfa.evaluate((g) =>
    [...document.querySelectorAll("button")].filter(eval(g)).filter((b) => /İşlemler/.test(b.textContent)).length, gorunur);

  const cekSilDugmesi = async (cekNo, digerNo) => {
    await sayfa.evaluate(({ cekNo, digerNo }) => {
      const b = [...document.querySelectorAll('[data-sil-onay]')]
        .filter((x) => x.getBoundingClientRect().width > 0)
        .find((x) => {
          let e = x.parentElement;
          while (e && !e.textContent.includes(cekNo)) e = e.parentElement;
          return e && !e.textContent.includes(digerNo);
        });
      if (b) b.click();
    }, { cekNo, digerNo });
  };
  await cekSilDugmesi("12345", "77777");
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): pencere çek satırının DIŞINDA açılıyor.
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(1500);

  // İşlem hiç görmemiş çek de aynı: silinince DOĞDUĞU tahsilat caride kalmıyor.
  await cekSilDugmesi("77777", "12345");
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): pencere çek satırının DIŞINDA açılıyor.
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(1500);

  const m2 = await depoOku(sayfa, "muhasebe:data");
  const c2 = await depoOku(sayfa, "cari:data");
  const cop = await depoOku(sayfa, "cop:data");
  const copKayitlari = (Array.isArray(cop) ? cop : ((cop || {}).kayitlar || []));
  const cekSilmeSonrasi = {
    kalanCekler: (m2.cekler || []).map((c) => c.id),
    musteriHareketleri: hareketSayisi(c2, "Müşteri B"),
    // Çöpte hem çek hem tahsilat duruyor: "bu çek nereye gitti" sorusunun cevabı.
    copTurleri: copKayitlari.map((k) => k.tur).filter((x) => x === "cek" || x === "cariHareketi").sort(),
  };

  await tarayici.close();
  return {
    hatalar,
    girisFisiOnce: { ...girisFisiOnce, kilitMesajiCiroFisiniSoyluyor: /ODM-20260910-001/.test(girisFisiOnce.kilitMesaji || ""), kilitMesaji: undefined },
    temizCekFisi: { kilitRozeti: temizCekFisi.kilitRozeti, silDugmesi: temizCekFisi.silDugmesi },
    ciroFisi: { kilitRozeti: ciroFisi.kilitRozeti, silDugmesi: ciroFisi.silDugmesi },
    ekstreCiroluCek: ekstreCiroluCek && { kilit: ekstreCiroluCek.kilit, silDugmesi: ekstreCiroluCek.silDugmesi,
      mesajCiroFisiniSoyluyor: /ODM-20260910-001/.test(ekstreCiroluCek.kilitMesaji || "") },
    ekstreTemizCek: ekstreTemizCek && { kilit: ekstreTemizCek.kilit, silDugmesi: ekstreTemizCek.silDugmesi },
    ciroSonrasi,
    girisFisiSonra: { kilitRozeti: girisFisiSonra.kilitRozeti, silDugmesi: girisFisiSonra.silDugmesi },
    islemlerDugmesiSayisi,
    cekSilmeSonrasi,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
