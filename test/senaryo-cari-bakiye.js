// SENARYO — CARİ BAKİYESİ PARA BİRİMİ BAZINDA.
//
// Kullanıcı ekran görüntüsüyle bildirdi: ekstrede tutar "2.124,21 €" yazarken kart başlığındaki
// bakiye aynı sayıyı "₺" sembolüyle gösteriyordu. Bakiye bütün hareketlerin `tutar` alanını
// toplayıp sonuna ₺ koyuyordu — hareketin kendi para birimine hiç bakmadan.
//
// Ölçülen: tek para birimli caride doğru sembol, KARIŞIK para birimli caride sayıların
// toplanmayıp ayrı ayrı yazılması.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  // Müşteri B: yalnızca EUR hareketleri
  cariler[1].hareketler = [
    { id: "e1", tarih: "2026-08-30", yon: "Borç", tutar: 2124.21, paraBirimi: "EUR", defter: "Genel", fisNo: "SAT-1", aciklama: "satış" },
  ];
  // Tedarikçi A: TRY + USD karışık
  cariler[0].hareketler = [
    { id: "t1", tarih: "2026-08-30", yon: "Borç", tutar: 1000, paraBirimi: "TRY", defter: "Genel", fisNo: "AF-1", aciklama: "alış" },
    { id: "t2", tarih: "2026-08-30", yon: "Borç", tutar: 50, paraBirimi: "USD", defter: "Genel", fisNo: "AF-2", aciklama: "alış" },
  ];
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(800);

  const ekran = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    const al = metin.match(/Alacak: [^B]*/);
    return {
      // Kart başlıklarındaki bakiyeler
      musteriEUR: /2\.124,21 €/.test(metin),
      musteriYanlisTL: /2\.124,21 ₺/.test(metin),
      karisikAyriYazildi: /1\.000 ₺ · 50 \$/.test(metin) || /1\.000 ₺ · \+?50 \$/.test(metin),
      karisikToplandi: /1\.050/.test(metin),
      ozet: al ? al[0].trim().slice(0, 60) : "yok",
    };
  });
  await tarayici.close();
  return { hatalar, ekran };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
