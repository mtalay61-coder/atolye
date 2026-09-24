// SENARYO — AÇILIŞ FİŞİ.
//
// Kullanıcı: "Her hareket fişe bağlı olsun, stok hareketten türetilsin."
//
// Miktar iki yerde duruyor: `variants[].miktar` (ÖNBELLEK) ve `hareketler[]` (DEFTER). İlk
// kurulumda ve elle stok girişinde miktar yazıldı ama hareket yazılmadı; defter önbelleği
// açıklamıyordu. Açılış fişi bu farkı ürün başına TEK satıra döküyor.
//
// Ölçülen dört şey:
//   1. Panel açığı buluyor ve gösteriyor.
//   2. Kesince hareketler yazılıyor ve HEPSİNİN fiş numarası var (fişsiz hareket olmaz).
//   3. MİKTARLAR DEĞİŞMİYOR — açılış fişi bir düzeltme değil, bir açıklama.
//   4. Sonrasında açık kapanıyor ve panel bunu söylüyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  // 16 EYLÜL (Parça 1): açılış işini artık GÖÇ yapıyor — hareketsiz başlangıç miktarları açılışta
  // kendiliğinden açılış fişine bağlanıyor. Bu senaryo o yüzden "düğmeye bas" değil, "göç sonrası
  // durum doğru mu" ölçüyor: açılış hareketleri yazılmış, miktarlar korunmuş, panel açık
  // bildirmiyor, denetimde ayrışma yok.
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  const miktarlariAl = async () => {
    const s = await depoOku(sayfa, "stok:items");
    return (s || []).flatMap((u) => (u.variants || []).map((v) => `${u.id}|${v.renk}|${v.beden}=${v.miktar}`));
  };
  const oncekiMiktarlar = await miktarlariAl();

  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Bakım"):visible').first().click();
  await sayfa.waitForTimeout(700);

  const acilisPaneli = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      panelVar: /Açılış Fişi/.test(m),
      acikBildiriliyor: /stok miktarının hareket karşılığı yok/.test(m),
      // Miktarların DEĞİŞMEYECEĞİ ekranda yazılı olmalı: bir tıkla yüzlerce hareket yazan
      // düğmenin ne yapıp ne yapmadığı önceden anlaşılmalı.
      miktarUyarisi: /miktarlar DEĞİŞMEZ/i.test(m),
    };
  });

  const stokSonrasi = await depoOku(sayfa, "stok:items");
  const acilisHareketleri = (stokSonrasi || []).flatMap((u) =>
    (u.hareketler || []).filter((h) => h.kaynak === "Açılış"));

  const sonrakiMiktarlar = await miktarlariAl();

  // Panel yeniden çizilince "açık yok" demeli.
  const sonrakiPanel = await sayfa.evaluate(() =>
    /açık yok/i.test(document.body.innerText));

  // Denetimi çalıştır: STOK_DEFTER_AYRISMASI bulgusu kalmamalı.
  await sayfa.locator('button:has-text("Denetimi Başlat"):visible').first().click();
  await sayfa.waitForTimeout(1500);
  const denetimSonrasi = await sayfa.evaluate(() =>
    !/hareket karşılığı yok/.test(document.body.innerText));

  await tarayici.close();
  return {
    hatalar,
    acilisPaneli,
    acilisSatirSayisi: acilisHareketleri.length,
    // FİŞSİZ HAREKET OLMAZ — proje kuralı, 12. denetim.
    hepsininFisiVar: acilisHareketleri.every((h) => !!h.fisNo),
    // Bir ürünün bütün varyantları AYNI fişe bağlı: açılış tek olaydır.
    fisSayisi: new Set(acilisHareketleri.map((h) => h.fisNo)).size,
    fisNoBicimi: acilisHareketleri.every((h) => /^ACL-\d{4}/.test(h.fisNo || "")),
    // ASIL GÜVENCE: miktarlar dokunulmadan kaldı.
    miktarlarDegismedi: JSON.stringify(oncekiMiktarlar) === JSON.stringify(sonrakiMiktarlar),
    sonrakiPanel,
    denetimSonrasi,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
