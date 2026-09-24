// SENARYO — ÜRETİM İŞÇİLİĞİNİN CARİ YÖNÜ (22 Eylül, v1.409.0)
//
// Kullanıcı: "üretimde oluşan işçilik fişleri ters yazılıyor, bizim personele borçlanmamız gerekli".
// İşçilik "Borç" yazılıyordu: personel bize borçlu görünüyor, ona yapılan ödeme (o da "Borç")
// bakiyeyi kapatmak yerine BÜYÜTÜYORDU (ekranda 5.320 işçilik + 5.000 ödeme = +10.320).
//
// Bu yön daha önce HİÇ ölçülmedi: tohumdaki işçilik kaydı elle ve doğru yönde (Alacak) kurulmuştu,
// senaryolar uygulamanın YAZDIĞI yönü değil tohumu okuyordu. Burada işçilik ARAYÜZDEN doğuyor:
// teslim alma formu → personel carisi. Bakiye kuralı `Borç − Alacak` (pozitif = cari bize borçlu).
//
// Ölçülen: yeni işçilik hareketinin yönü; personelin bakiyesi (biz ona borçlu → negatif); tohumdaki
// ödeme (Borç 100) ile birlikte ödemenin borcu AZALTTIĞI; kâr-zarar işçiliği sayıyor mu.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  st.find((p) => p.id === "u2").prosesUcretleri = { Kesim: 35 };
  t["stok:items"] = JSON.stringify(st);
  // Personel C: tohumdaki işçilik kaydı (Alacak 30) + ona yapılmış bir ödeme (Borç 100).
  const cariler = JSON.parse(TOHUM["cari:data"]);
  cariler.find((c) => c.id === "c3").hareketler.push({ id: "h-odeme", tarih: "2026-09-01", zaman: "2026-09-01T09:00:00.000Z",
    yon: "Borç", tutar: 100, paraBirimi: "TRY", odemeSekli: "Nakit", vade: "", fisNo: "ODM-TEST", defter: "Genel", aciklama: "Ödeme" });
  t["cari:data"] = JSON.stringify(cariler);
  // Kesim VERİLMİŞ, teslim alınmamış üretim (3 çift × 35 ₺ = 105 ₺ işçilik).
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up2", siparisNo: "1002", takipKodu: "1002", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
    stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "c3",
      atamalar: [{ id: "at2", personelId: "c3", miktar: 3, bedenMiktarlari: { "41": 3 }, parcaBarkodu: "1002-1",
        verildiMi: true, tamamlandiMi: false, verilmeTarihi: "2026-09-02",
        verilenHammaddeler: { "u1|Siyah|": { verilen: 6, beklenen: 6 } } }] }],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2500);
  await sayfa.getByRole("button", { name: "Üretim", exact: true }).click();
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("1002", { exact: true }).last().click();
  await sayfa.waitForTimeout(900);
  const formVar = await sayfa.locator("[data-teslim-al]:visible").count();
  if (formVar) await sayfa.locator("[data-teslim-al]:visible").first().click();
  await sayfa.waitForTimeout(1800);

  const personel = (await depoOku(sayfa, "cari:data")).find((c) => c.id === "c3");
  const hareketler = personel.hareketler || [];
  const yeni = hareketler.find((h) => /^1002.*-İşçilik$/.test(h.fisNo || ""));
  const bakiye = hareketler.reduce((b, h) => b + (h.yon === "Borç" ? 1 : -1) * (h.tutar || 0), 0);

  // Kâr-zarar: rapor işçiliği saymaya DEVAM ediyor mu? (Rapor "Borç" olanları sayıyordu; yön
  // düzeltilince yeni işçilik rapordan düşerdi. Artık yöne bakılmıyor — eski ve yeni ikisi de.)
  const kz = await sayfa.evaluate((c) => {
    const r = window.__erp.karZararHesapla({ stok: [], cariler: c, muhasebe: {}, giderKartlari: [], donem: "tumu" });
    return { uretimIscilik: r.uretimIscilik, detay: r.iscilikDetay };
  }, await depoOku(sayfa, "cari:data"));

  await tarayici.close();
  return {
    hatalar, formVar: formVar > 0,
    yeniIscilik: yeni ? { yon: yeni.yon, tutar: yeni.tutar, adet: yeni.miktar, birimFiyat: yeni.birimFiyat } : null,
    // −30 (tohum işçilik) −105 (yeni işçilik) +100 (ödeme) = −35 → biz personele 35 ₺ borçluyuz.
    personelBakiyesi: bakiye,
    bizBorcluyuz: bakiye < 0,
    // 30 (tohum) + 105 (yeni) = 135; ödeme maliyet değil, sayılmamalı.
    karZararIscilik: kz,
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
