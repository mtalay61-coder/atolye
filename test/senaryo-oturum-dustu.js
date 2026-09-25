// SENARYO — BULUT OTURUMU DÜŞTÜ (kullanıcı, 21 Eylül: "hiç işlem yapılmadı kasada" — ekranda
// `Supabase 401 ... 42501 ... TO anon ... permission denied for table muhasebe`).
//
// Sebep: jeton yenilenemeyince oturum sessizce siliniyor, sonraki yazmalar ANONİM gidip
// reddediliyordu. Kasada işlem yapılmadan yazma = açılıştaki otomatik kur güncellemesi.
//
// Ölçülen: 42501/anon hatasıyla bekleyen bir yazma varken (1) üstte "Bulut oturumunuz kapandı"
// şeridi çıkıyor, (2) "Yeniden giriş yap" düğmesi var, (3) basınca giriş ekranı "oturumunuz
// kapandı, hiçbir şey kaybolmadı" açıklamasıyla açılıyor. Bekleyen yazma defteri tohumdan.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2600);
  // Yazma hatasını uygulamanın kendi kanalından ilet (bekleyen yazma defteri bununla güncellenir).
  // Test ortamı açılışta kendi "Failed to fetch" kayıtlarını yazıyor; 42501/anon hatası
  // açılıştan SONRA, uygulamanın kendi kanalından ekleniyor.
  await sayfa.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}");
    d["muhasebe:data"] = { tablo: "muhasebe", deneme: 1, zaman: "2026-09-21T12:45:00.000Z",
      hata: 'Supabase 401: {"code":"42501","hint":"GRANT SELECT, INSERT, UPDATE ON public.muhasebe TO anon;","message":"permission denied for table muhasebe"}' };
    if (typeof window.__bekleyenYazmaDegisti === "function") window.__bekleyenYazmaDegisti(d);
  });
  await sayfa.waitForTimeout(500);
  const serit = await sayfa.evaluate(() => {
    const e = document.querySelector("[data-oturum-dustu]");
    return e ? { var: true, dugme: !!e.querySelector("[data-yeniden-giris]") } : { var: false };
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-yeniden-giris]"); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const giris = await sayfa.evaluate(() => /Oturumunuz kapandı/.test(document.body.innerText));

  await tarayici.close();
  return { hatalar, serit, giris };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
