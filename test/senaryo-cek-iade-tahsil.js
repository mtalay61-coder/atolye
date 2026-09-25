// SENARYO — ÇEK İADESİ VE TAHSİLİ KAYIT DOĞURUYOR (kullanıcı, 10 Eylül).
//
//   "İade cari hareket doğurur, düzeltmen gereken."
//   "Tahsile ver demek tahsil günü gelene kadar bankada kalsın, banka tahsil etsin demek. Sonraki
//    adımı çek ödendiğinde tahsil edildi olup para hangi bankaya verilmiş ise o bankanın kasasına
//    girecek."
//
// Değişmez kural gereği her yeni kayıt SİLİNİNCE de ölçülüyor:
//   1. İade → müşteriye ters hareket (Ödeme, Borç, girişin tutarı).
//   2. Tahsildeki çek → Tahsil Edildi: para verildiği bankaya giriyor; banka SORULMUYOR, yazılıyor.
//   3. Dövizli çek, TL bankaya: kur çevirici hesaba girecek tutarı öneriyor.
//   4. Tahsil edilmiş çekin giriş fişi kilitli, kilit hangi bankadan neyin silineceğini söylüyor.
//   5. İade fişi silinince çek portföye dönüyor.
//   6. Banka hareketi silinince çek Tahsilde'ye dönüyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const giris = (id, fisNo, tutar, paraBirimi, cekNo, dk) => ({
    id, tarih: "2026-09-10", zaman: `2026-09-10T09:0${dk}:00.000Z`, yon: "Alacak", tutar, paraBirimi,
    odemeSekli: "Çek", islemTipi: "Tahsilat", fisNo, aciklama: `Müşteri çeki · No ${cekNo}`, defter: "Genel",
  });
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => (c.unvan === "Müşteri B"
    ? { ...c, hareketler: [
        giris("h-giris1", "THS-20260910-001", 42000, "TRY", "12345", 1),
        giris("h-giris2", "THS-20260910-002", 5000, "TRY", "77777", 2),
        giris("h-giris3", "THS-20260910-003", 1000, "USD", "55555", 3),
      ] }
    : c)));
  const tahsileSatiri = { id: "cekh-t", islem: "Bankaya Tahsile Ver", oncekiDurum: "Portföyde", yeniDurum: "Tahsilde",
    tarih: "2026-09-10", bankaId: "b1", bankaAd: "Ziraat TL" };
  t["muhasebe:data"] = JSON.stringify({
    kurlar: { USD: 42, EUR: 56 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }],
    bankalar: [{ id: "b1", ad: "Ziraat TL", paraBirimi: "TRY", hareketler: [] }],
    cekler: [
      { id: "cA", durum: "Portföyde", tip: "Alınan", cekNo: "12345", cariId: "c2", tutar: 42000, paraBirimi: "TRY",
        vadeTarihi: "2026-12-01", hareketId: "h-giris1" },
      { id: "cB", durum: "Tahsilde", tip: "Alınan", cekNo: "77777", cariId: "c2", tutar: 5000, paraBirimi: "TRY",
        vadeTarihi: "2026-12-05", hareketId: "h-giris2", tahsilBankaId: "b1", tahsilBankaAd: "Ziraat TL", gecmis: [tahsileSatiri] },
      { id: "cC", durum: "Tahsilde", tip: "Alınan", cekNo: "55555", cariId: "c2", tutar: 1000, paraBirimi: "USD",
        vadeTarihi: "2026-12-10", hareketId: "h-giris3", tahsilBankaId: "b1", tahsilBankaAd: "Ziraat TL",
        gecmis: [{ ...tahsileSatiri, id: "cekh-t3" }] },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  const muhasebeSekmesi = async (ad) => {
    // v1.458.0: çekler "Çek & Senet"te, kasa/banka "Kasa & Banka"da.
    await modulAc(sayfa, ad === "Çek" ? "Çek & Senet" : "Kasa & Banka");
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate((ad) => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => x.textContent.trim() === ad && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    }, ad);
    await sayfa.waitForTimeout(700);
  };
  // Çek satırındaki "İşlemler" düğmesi: çek numarasını taşıyan EN KÜÇÜK satırın içindeki düğme.
  const cekIslemi = async (cekNo, islemAciklamasi, onayDugmesi) => {
    await sayfa.evaluate((no) => {
      const hepsi = ["12345", "77777", "55555"];
      const b = [...document.querySelectorAll("button")]
        .filter((x) => /İşlemler/.test(x.textContent) && x.getBoundingClientRect().width > 0)
        .find((x) => {
          // Düğmeden yukarı çıkıp çek numarası taşıyan İLK kabı bul: o kap bu çekin satırı.
          let e = x.parentElement;
          while (e && !hepsi.some((n) => e.textContent.includes(n))) e = e.parentElement;
          return e && e.textContent.includes(no) && hepsi.filter((n) => n !== no).every((n) => !e.textContent.includes(n));
        });
      if (b) b.click();
    }, cekNo);
    await sayfa.waitForTimeout(500);
    await sayfa.evaluate((a) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(a) && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    }, islemAciklamasi);
    await sayfa.waitForTimeout(500);
    const panel = await sayfa.evaluate(() => ({
      tahsilHesabi: (document.querySelector("[data-tahsil-hesabi]") || {}).textContent || null,
      sayiKutulari: [...document.querySelectorAll('input[type="number"]')]
        .filter((x) => x.getBoundingClientRect().width > 0 && x.closest("[style*='z-index: 900']")).map((x) => x.value),
    }));
    await sayfa.evaluate((ad) => {
      const b = [...document.querySelectorAll("button.btn-primary")]
        .find((x) => x.textContent.trim() === ad && x.getBoundingClientRect().width > 0);
      if (b) b.click();
    }, onayDugmesi);
    await sayfa.waitForTimeout(1500);
    return panel;
  };

  // ---- 1. İADE ------------------------------------------------------------------------------------
  await muhasebeSekmesi("Çek");
  await cekIslemi("12345", "VEREN cariye geri ver", "İade Et");
  let m = await depoOku(sayfa, "muhasebe:data");
  let cariler = await depoOku(sayfa, "cari:data");
  const musteri = () => cariler.find((c) => c.unvan === "Müşteri B") || {};
  const iadeHareketi = (musteri().hareketler || []).find((h) => /Çek iadesi/.test(h.aciklama || "")) || {};
  const cekA = m.cekler.find((c) => c.id === "cA");
  const iade = {
    cekDurumu: cekA.durum,
    hareket: { islemTipi: iadeHareketi.islemTipi, yon: iadeHareketi.yon, tutar: iadeHareketi.tutar,
      paraBirimi: iadeHareketi.paraBirimi, odmFisi: /^ODM-/.test(iadeHareketi.fisNo || ""), cekId: iadeHareketi.cekId },
    gecmisBagli: cekA.gecmis[cekA.gecmis.length - 1].hareketId === iadeHareketi.id,
  };
  const iadeFisNo = iadeHareketi.fisNo;

  // ---- 2. TAHSİL — TL çek, verildiği bankaya --------------------------------------------------------
  const panelB = await cekIslemi("77777", "bedeli hesaba geçti", "Tahsil Edildi");
  // ---- 3. TAHSİL — USD çek, TL bankaya: kur çevirici --------------------------------------------------
  const panelC = await cekIslemi("55555", "bedeli hesaba geçti", "Tahsil Edildi");
  m = await depoOku(sayfa, "muhasebe:data");
  const banka = () => (m.bankalar || [])[0] || {};
  const tahsil = {
    panelB, panelC,
    bankaHareketleri: (banka().hareketler || []).map((h) => [h.yon, h.tutar, h.cekId]),
    kasayaDokunulmadi: (m.kasalar[0].hareketler || []).length === 0,
    durumlar: m.cekler.filter((c) => c.id !== "cA").map((c) => [c.cekNo, c.durum]),
    gecmisBagli: m.cekler.filter((c) => c.id !== "cA").every((c) => {
      const son = c.gecmis[c.gecmis.length - 1];
      return (banka().hareketler || []).some((h) => h.id === son.hesapHareketId && h.cekId === c.id);
    }),
    // Cari DEĞİŞMEDİ: müşterinin borcu çek alınırken kapandı, tahsilde ikinci kez kapanmamalı.
    cariHareketSayisi: (musteri().hareketler || []).length,
  };

  // ---- 4. KİLİT MESAJI -----------------------------------------------------------------------------
  await modulAc(sayfa, "Fişler");
  await sayfa.waitForTimeout(800);
  await sayfa.getByText("THS-20260910-002", { exact: true }).filter({ visible: true }).first().click();
  await sayfa.waitForTimeout(700);
  // Çek kilidi rozeti de İŞLEMLER menüsünün içinde (18 Eylül) — ölçümden önce menüyü aç.
  {
    const acik = await sayfa.evaluate(() =>
      [...document.querySelectorAll('[data-fis-islem-menusu="acik"]')].some((x) => x.offsetParent));
    if (!acik) {
      const d = sayfa.locator("[data-fis-islemler]:visible").first();
      if (await d.count()) { await d.click(); await sayfa.waitForTimeout(400); }
    }
  }
  const kilitMesaji = await sayfa.evaluate(() =>
    ([...document.querySelectorAll("[data-cek-kilidi]")].find((e) => e.getBoundingClientRect().width > 0) || { getAttribute: () => "" })
      .getAttribute("title"));
  const kilit = { bankayiSoyluyor: /Ziraat TL/.test(kilitMesaji || ""), yoluSoyluyor: /tahsili geri alın/.test(kilitMesaji || "") };

  // ---- 5. İADE FİŞİ SİLİNİR → PORTFÖY ------------------------------------------------------------------
  // İade hareketi hiç yazılmadıysa (eski davranış) silinecek fiş yok — ölçüm null kalır.
  let iadeGeriAlma = null;
  if (iadeFisNo) {
  await sayfa.getByText(iadeFisNo, { exact: true }).filter({ visible: true }).first().click();
  await sayfa.waitForTimeout(700);
  // İŞLEMLER MENÜSÜ (18 Eylül): silme düğmesi menünün içinde; önce menüyü aç.
  {
    const acik = await sayfa.evaluate(() =>
      [...document.querySelectorAll('[data-fis-islem-menusu="acik"]')].some((x) => x.offsetParent));
    if (!acik) {
      const d = sayfa.locator("[data-fis-islemler]:visible").first();
      if (await d.count()) { await d.click(); await sayfa.waitForTimeout(400); }
    }
  }
  // Menüdeki silme düğmesi: bağlantılı fişte "Sil", yetim fişte "Bu Fişi Temizle".
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent
      && /^(Sil|Bu Fişi Temizle)$/.test((x.textContent || "").trim()));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-evet-temizle]:visible").first().click();
  await sayfa.waitForTimeout(1500);
  m = await depoOku(sayfa, "muhasebe:data");
  cariler = await depoOku(sayfa, "cari:data");
  const cekA2 = m.cekler.find((c) => c.id === "cA");
  iadeGeriAlma = {
    cekDurumu: cekA2.durum,
    sonSatir: cekA2.gecmis[cekA2.gecmis.length - 1].islem,
    iadeHareketiKalmadi: !(musteri().hareketler || []).some((h) => h.id === iadeHareketi.id),
  };
  }

  // ---- 6. BANKA HAREKETİ SİLİNİR → TAHSİLDE -------------------------------------------------------------
  await muhasebeSekmesi("Banka");
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Ziraat TL/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(700);
  // SİLME ONAYLI (17 Eylül): tek dokunuş sormak, ikincisi silmek — para kaydında yanlış dokunuş
  // pahalı. Senaryo iki kez dokunuyor.
  // Onay artık pencere (21 Eylül): ilk tık satırdaki ikon, ikinci adım penceredeki Sil.
  {
    await sayfa.evaluate(() => {
      const tr = [...document.querySelectorAll("tr")]
        .find((x) => x.getBoundingClientRect().width > 0 && /No 77777/.test(x.textContent));
      const b = tr && tr.querySelector("button[title*='sil'], button[title*='Sil'], button[title*='Emin']");
      if (b) b.click();
    });
    await sayfa.waitForTimeout(400);
  }
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.waitForTimeout(1500);
  m = await depoOku(sayfa, "muhasebe:data");
  const cekB = m.cekler.find((c) => c.id === "cB");
  const tahsilGeriAlma = {
    cekDurumu: cekB.durum,
    sonSatir: cekB.gecmis[cekB.gecmis.length - 1].islem,
    kalanBankaHareketleri: (banka().hareketler || []).map((h) => h.cekId),
    // Diğer tahsil edilmiş çek etkilenmedi.
    digerCek: m.cekler.find((c) => c.id === "cC").durum,
  };

  await tarayici.close();
  return { hatalar, iade, tahsil, kilit, iadeGeriAlma, tahsilGeriAlma };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
