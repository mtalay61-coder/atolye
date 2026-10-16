// SENARYO — KULLANICI KISITLARI (v1.689, kullanıcı: "kullanıcıların görmesini istemeyeceğim şeyler
// var … onay sistemini deaktif etmemiz lazım").
//
// Ölçülen: muhasebe yetkili ama "Finans raporları" görünürlüğü KAPALI kullanıcı Finans Raporu /
// Gelir-Gider menüsünü ve anasayfadaki Toplam Alacak kartını görmez; izin verilince görür.
// Onay sistemi varsayılan kapalı olduğundan onay paneli/isteği oluşmaz.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

const MUH = { goruntuleme: true, duzenleme: true, kaydetme: true, silme: false };
function tohum(gorunurluk) {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.girisAktifMi = true;
  tan.kullanicilar = [
    { id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true },
    { id: "k2", ad: "Muhasebeci", kullaniciAdi: "muh", sifre: "123456", rol: "", gorunurluk,
      yetkiler: { muhasebe: MUH, cari: MUH, anasayfa: MUH } },
  ];
  t["tanimlar:data"] = JSON.stringify(tan);
  return t;
}
async function olc(gorunurluk, hatalar) {
  const { tarayici, sayfa } = await uygulamaAc(tohum(gorunurluk), { hataYaz: false, onceRota: (s) => bulutGirisRotasi(s) });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.locator("input").first().fill("muh");
  await sayfa.locator('input[type="password"]').first().fill("123456");
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Giriş/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(1800);
  const r = await sayfa.evaluate(() => ({
    finansMenusu: !!document.querySelector('button[title="Finans Raporu"]'),
    toplamAlacakKarti: /toplam alacak/i.test(document.body.innerText),
  }));
  await tarayici.close();
  return r;
}
async function calistir() {
  const hatalar = [];
  const kapali = await olc({}, hatalar);
  const acik = await olc({ finansRaporlari: true }, hatalar);
  return { hatalar, kapali, acik };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
