// SENARYO — FİŞ DEFTERİ BAYAT OKUMA (22 Eylül, denetim 18)
//
// Üç hata, üçü de "fonksiyon eski defter fotoğrafına bakıyor":
//  1) ÜRETİM GERİ ALMA defterde hiçbir fişi iptal etmiyordu — çağıranın bağımlılık dizisinde
//     `fisDefterindeIptal` yoktu, açılıştaki BOŞ defteri görüyordu. (Gerçek arayüzden ölçülür.)
//  2) Arka arkaya iptal (`forEach`) — hepsi aynı fotoğraftan kuruluyor, yalnız sonuncusu kalıyordu.
//  3) Yazma başarısızken geri alma, bekleme sırasında yazılan fişi de siliyordu; başarısız fiş ise
//     o arada yazılan tam defterle depoya girmiş kalıyordu.
// 2-4 kancanın kendisiyle ölçülür (küçük bir bileşen içinde, gerçek React ve sahte depoyla):
// eşzamanlılığı arayüzden sıraya koymak mümkün değil.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];

  // ---- 1) ÜRETİM GERİ ALMA → DEFTERDE İPTAL (arayüz) ----
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  // Açılışta otomatik defter doluyor; sabit bekleme paralel yükte yetmiyordu (22 Eylül) —
  // 1001-Kesim kayıtları görünene kadar beklenir (en çok 15 sn).
  for (let i = 0; i < 30; i++) {
    const d = (await depoOku(sayfa, "fisdefter:data")) || [];
    if (d.some((f) => /^1001-Kesim/.test(f.fisNo))) break;
    await sayfa.waitForTimeout(500);
  }
  const kesimDurumu = async () => ((await depoOku(sayfa, "fisdefter:data")) || [])
    .filter((f) => /^1001-Kesim/.test(f.fisNo)).map((f) => `${f.fisNo}:${f.iptal ? "iptal" : "aktif"}`).sort();
  const geriAlmaOncesi = await kesimDurumu();
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(600);
  await sayfa.getByText("1001", { exact: true }).last().click();
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("detay / geri al", { exact: false }).last().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Geri Al")').last().click();
  await sayfa.waitForTimeout(2000);
  const geriAlmaSonrasi = await kesimDurumu();

  // ---- 2-4) KANCA ÜZERİNDE ----
  const kanca = await sayfa.evaluate(async () => {
    const R = window.__React;
    const { useFisDefteriYazma } = window.__erp;
    const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
    const depo = window.__depo;
    const ANAHTAR = "fisdefter:data";
    const ozet = (d) => (d || []).map((f) => `${f.fisNo}${f.iptal ? "(iptal)" : ""}`).join(",");

    // Depoyu boz: fiş defterine yapılan ilk N yazma 150 ms bekleyip hata verir.
    let bozukKalan = 0;
    const asilSet = window.storage.set.bind(window.storage);
    window.storage.set = async (a, d, p) => {
      if (a === ANAHTAR && bozukKalan > 0) { bozukKalan -= 1; await bekle(150); throw new Error("depo dolu (test)"); }
      return asilSet(a, d, p);
    };

    let api = null, ilkApi = null, durum = null, disaridanEkle = null;
    const toastlar = [];
    function Duzenek({ baslangic }) {
      const [fd, setFd] = R.useState(baslangic);
      durum = fd;
      disaridanEkle = (k) => setFd((o) => [k, ...o]);
      api = useFisDefteriYazma({ fisDefteri: fd, setFisDefteri: setFd, showToast: (m) => toastlar.push(m),
        kaydetmeHatasiBildir: () => {}, aktifKullanici: { ad: "test" } });
      if (!ilkApi) ilkApi = api;
      return null;
    }
    const kur = async (baslangic) => {
      api = null; ilkApi = null; durum = null;
      const kap = document.createElement("div"); document.body.appendChild(kap);
      const kok = window.__ReactDOMClient.createRoot(kap);
      kok.render(R.createElement(Duzenek, { baslangic }));
      for (let i = 0; i < 50 && !api; i++) await bekle(50);
      return kok;
    };
    const kayit = (fisNo) => ({ id: fisNo, fisNo, iptal: false, stokHareketleri: [], cariHareketleri: [] });
    const sonuc = {};

    // 2) Arka arkaya üç iptal, aynı anda.
    let kok = await kur([kayit("X"), kayit("Y"), kayit("Z")]);
    ["X", "Y", "Z"].forEach((n) => api.fisDefterindeIptal(n));
    await bekle(300);
    sonuc.ardArdaIptal = { bellek: ozet(durum), depo: ozet(JSON.parse(depo[ANAHTAR] || "[]")) };
    kok.unmount();

    // 3) Eski kopya: ilk çizimdeki fonksiyon, sonradan eklenen kaydı görmeli.
    kok = await kur([kayit("ESKI")]);
    disaridanEkle(kayit("YENI"));
    // Çizim bitene kadar bekle (sabit 100 ms yoğun yükte yetmiyordu).
    for (let i = 0; i < 50 && !(durum || []).some((k) => k.fisNo === "YENI"); i++) await bekle(50);
    ilkApi.fisDefterindeIptal("YENI");
    const cift = await ilkApi.fisDefterineKayitYaz(kayit("ESKI"));
    await bekle(200);
    sonuc.eskiKopya = { bellek: ozet(durum), ciftKayitReddedildi: cift === false };
    kok.unmount();

    // 4) Aynı çizimde çift tıklama.
    kok = await kur([]);
    const [c1, c2] = await Promise.all([api.fisDefterineKayitYaz(kayit("K")), api.fisDefterineKayitYaz(kayit("K"))]);
    await bekle(200);
    sonuc.ciftTiklama = { birinci: c1, ikinci: c2, bellek: ozet(durum) };
    kok.unmount();

    // 5) Yazma başarısız, bekleme sırasında başka fiş yazılıyor.
    kok = await kur([kayit("ESKI")]);
    delete depo[ANAHTAR];
    bozukKalan = 3;                                  // A'nın üç denemesi de düşer
    const aSozu = api.fisDefterineKayitYaz(kayit("A"));
    await bekle(50);                                 // A beklerken çizim oldu
    const bSozu = api.fisDefterineKayitYaz(kayit("B"));
    const [a, b] = await Promise.all([aSozu, bSozu]);
    await bekle(1500);
    sonuc.basarisizYazma = { a, b, bellek: ozet(durum), depo: ozet(JSON.parse(depo[ANAHTAR] || "[]")),
      uyari: toastlar.some((t) => /Fiş kaydedilemedi/.test(t)) };
    kok.unmount();
    window.storage.set = asilSet;
    return sonuc;
  });

  await tarayici.close();
  return { hatalar, geriAlmaOncesi, geriAlmaSonrasi, ...kanca };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
