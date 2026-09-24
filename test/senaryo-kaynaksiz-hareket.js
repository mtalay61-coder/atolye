// SENARYO — KAYNAĞI BELİRSİZ HAREKET (kullanıcı, 20 Eylül: "kayıtsız stok, hareket istemiyorum;
// neyin nereden geldiği belli olsun" + "veri denetimi bizi yanlışa sürüklüyor, düzelttiği şey
// aslında üstünü süpürmek").
//
// İKİ DEĞİŞİKLİK BİRLİKTE SINANIYOR:
//   1. Fiş numarası/kaynağı olmayan ya da numarası sonradan uydurulmuş (`fisOtomatik`) hareketler
//      denetimde bildiriliyor.
//   2. OTOMATİK ONARIM DÜĞMELERİ KALDIRILDI — denetim artık yalnız bildirir, düzeltme izi kalan
//      bir işlemle (sayım fişi, fişi geri alma) yapılır.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  // Fişsiz ve kaynaksız hareket: "bu 5 çift nereden geldi?" sorusunun cevabı yok.
  bot.hareketler = [...(bot.hareketler || []),
    { id: "hx1", tarih: "2026-09-19", renk: "Siyah", beden: "41", miktar: 5 }];
  t["stok:items"] = JSON.stringify(st);
  // Fişsiz cari hareketi (açılış değil).
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c, i) => (i === 0
    ? { ...c, hareketler: [...(c.hareketler || []),
        { id: "cx1", tarih: "2026-09-19", yon: "Borç", tutar: 1234, paraBirimi: "TRY", aciklama: "Belgesiz" }] }
    : c)));

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2600);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Bakım" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-denetim-baslat]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1700);

  const sonuc = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      stokBulgusu: /Kaynağı belirsiz stok hareketi/.test(m),
      cariBulgusu: /Fiş numarası olmayan cari hareketi/.test(m),
      // Onarım düğmelerinin HİÇBİRİ olmamalı.
      onarimDugmesiSayisi: document.querySelectorAll("[data-onar-karsilanan],[data-onar-rezervasyon],[data-onar-eksik-hareket]").length,
    };
  });

  await tarayici.close();
  return { hatalar, sonuc };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
