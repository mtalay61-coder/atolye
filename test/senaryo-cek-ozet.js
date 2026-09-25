// SENARYO — ÇEK SATIRINA DOKUNUNCA ÖZET (25 Eylül, v1.461.0).
//
// Kullanıcı: "Çekin üzerine tıklayınca çeki kimden alıp kime ciro ettiğimiz veya son durumu ile
// alakalı açılım yapsın."
//
// Ölçülenler:
//   1. Satıra (yazıya) dokununca özet açılıyor, tekrar dokununca kapanıyor; satırdaki düğmeler
//      (Yazdır vb.) özeti açıp kapatmıyor.
//   2. Ciro edilmiş çek: kimden alındı (cari, tarih, fiş), şu an "X'e ciro edildi" + ciro fişi +
//      karşı tarafa başka birimde işlenen tutar; yolculukta giriş ve ciro adımları.
//   3. Tahsildeki çek: "… tahsilde bekliyor", vadeye kalan gün; geri alınmış işlem üstü çizili.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Vade bugüne göreli: altın dosya her gün aynı kalsın.
const gunSonra = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  const ekle = (id, h) => { const c = cariler0.find((x) => x.id === id); c.hareketler = [...(c.hareketler || []), h]; };
  ekle("c2", { id: "hg1", tarih: "2026-09-10", yon: "Alacak", tutar: 42000, paraBirimi: "TRY", odemeSekli: "Çek", fisNo: "THS-0910001", islemTipi: "Tahsilat", aciklama: "Müşteri çeki · No 111", defter: "Genel" });
  ekle("c1", { id: "hc1", tarih: "2026-09-15", yon: "Borç", tutar: 1000, paraBirimi: "USD", odemeSekli: "Çek", fisNo: "ODM-0915001", islemTipi: "Ödeme", aciklama: "Çek cirosu · No 111", defter: "Genel" });
  ekle("c2", { id: "hg2", tarih: "2026-09-12", yon: "Alacak", tutar: 5000, paraBirimi: "TRY", odemeSekli: "Çek", fisNo: "THS-0912001", islemTipi: "Tahsilat", aciklama: "Müşteri çeki · No 222", defter: "Genel" });
  t["cari:data"] = JSON.stringify(cariler0);
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], kurlar: { USD: 42, EUR: 56 },
    bankalar: [{ id: "bnk1", ad: "Ziraat TL", paraBirimi: "TRY", hareketler: [] }],
    cekler: [
      { id: "ck1", durum: "Ciro Edildi", tip: "Alınan", cekNo: "111", cariId: "c2", tutar: 42000, paraBirimi: "TRY", vadeTarihi: gunSonra(30), banka: "Ziraat", hareketId: "hg1",
        gecmis: [{ id: "g1", islem: "Ciro Et", oncekiDurum: "Portföyde", yeniDurum: "Ciro Edildi", tarih: "2026-09-15", cariId: "c1", cariAd: "Tedarikçi A", tutar: 1000, paraBirimi: "USD", hareketId: "hc1" }] },
      { id: "ck2", durum: "Tahsilde", tip: "Alınan", cekNo: "222", cariId: "c2", tutar: 5000, paraBirimi: "TRY", vadeTarihi: gunSonra(5), banka: "İş Bankası", hareketId: "hg2",
        tahsilBankaId: "bnk1", tahsilBankaAd: "Ziraat TL",
        gecmis: [
          { id: "t1", islem: "Bankaya Tahsile Ver", oncekiDurum: "Portföyde", yeniDurum: "Tahsilde", tarih: "2026-09-13", bankaId: "bnk1", bankaAd: "Ziraat TL" },
          { id: "t2", islem: "Tahsile verme geri alındı", oncekiDurum: "Tahsilde", yeniDurum: "Portföyde", tarih: "2026-09-14", geriAlinanSatirId: "t1", geriAlma: true },
          { id: "t3", islem: "Bankaya Tahsile Ver", oncekiDurum: "Portföyde", yeniDurum: "Tahsilde", tarih: "2026-09-16", bankaId: "bnk1", bankaAd: "Ziraat TL" },
        ] },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(800);

  // Satırdaki çek numarasına (yazıya) dokunuş.
  const yaziyaDokun = (id, no) => sayfa.evaluate(({ id, no }) => {
    const satir = document.querySelector(`[data-cek-satir="${id}"]`);
    const span = [...satir.querySelectorAll("span")].find((x) => x.textContent.trim() === no);
    span.click();
  }, { id, no });
  const acikMi = (id) => sayfa.evaluate((id) => !!document.querySelector(`[data-cek-ozet="${id}"]`), id);
  const ozetOku = (id) => sayfa.evaluate((id) => {
    const k = document.querySelector(`[data-cek-ozet="${id}"]`);
    const metin = (s) => ((k.querySelector(s) || {}).innerText || "").split("\n").map((x) => x.trim()).filter(Boolean);
    return {
      kimden: metin("[data-cek-ozet-kimden]"),
      nerede: metin("[data-cek-ozet-nerede]"),
      vade: metin("[data-cek-ozet-vade]").filter((x) => /Vade(ye|si)/.test(x)),
      yolculuk: [...k.querySelectorAll("[data-cek-adim]")].map((a) => ({
        metin: a.innerText.replace(/\s+/g, " ").trim(),
        cizili: getComputedStyle(a.querySelector("b")).textDecorationLine === "line-through",
      })),
    };
  }, id);

  const ac = {};
  await yaziyaDokun("ck1", "111");
  await sayfa.waitForTimeout(300);
  ac.dokununcaAcildi = await acikMi("ck1");
  const ciro = await ozetOku("ck1");
  // Satırdaki bir düğme (Yazdır) özeti kapatmamalı.
  await sayfa.locator('[data-cek-yazdir="ck1"]').click();
  await sayfa.waitForTimeout(500);
  ac.dugmeKapatmadi = await acikMi("ck1");
  await sayfa.evaluate(() => {
    const k = document.querySelector("#cek-yazdir-alani");
    const b = k && [...k.parentElement.querySelectorAll("button")].find((x) => /Kapat/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);
  await yaziyaDokun("ck1", "111");
  await sayfa.waitForTimeout(300);
  ac.tekrarDokununcaKapandi = !(await acikMi("ck1"));

  await sayfa.locator('[data-cek-ayrinti="ck2"]').click();
  await sayfa.waitForTimeout(300);
  const tahsilde = await ozetOku("ck2");

  await tarayici.close();
  return { hatalar, ac, ciro, tahsilde };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
