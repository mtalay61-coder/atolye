// ORTAK TEST YARDIMCILARI
// Uygulamayı gerçek Chromium'da çalıştırır. `window.storage` bellek içi sahte bir depoyla
// değiştirilir; uygulama Supabase'e ulaşamayınca yerel kopyaya düşer, böylece veri tohumlanabilir.
const path = require("path");
const { chromium } = require("playwright");

// `onceRota(sayfa)`: sayfa yüklenmeden ÖNCE ağ rotaları kurmak için (açılıştaki Supabase
// okumasını taklit etmek gerekiyorsa). Uygulama ilk render'da buluta gider; sonradan kurulan rota
// o istekleri yakalayamaz.
// `tarayiciArgs`: Chromium bayrakları — örn. sahte kamera (`--use-file-for-fake-video-capture`).
// `adres`: uygulamayı file:// yerine bu http(s) adresinden aç — çağıran `onceRota` ile o adresi
// test.html'e yönlendirir (sürüm dosyası gibi göreli okumalar yalnız http'de çalışıyor).
async function uygulamaAc(tohum = {}, { hataYaz = true, onceRota = null, tarayiciArgs = [], adres = null, cevrimdisiKilidi = false, yuklemeyiBekle = true, tanimBasliklariKapali = false, receteOnayKapisi = false, firmaSecili = true, kurulumSihirbazi = false } = {}) {
  const tarayici = await chromium.launch({ args: tarayiciArgs });
  // Geniş pencere: dar ekranda kenar çubuğu daralıyor ve sekme düğmeleri gizleniyor.
  const sayfa = await tarayici.newPage({ viewport: { width: 1400, height: 950 } });
  if (hataYaz) {
    sayfa.on("pageerror", (e) => console.log("  [sayfa hatası]", e.message.split("\n")[0]));
    sayfa.on("console", (m) => { if (m.type() === "error") console.log("  [konsol]", m.text().slice(0, 200)); });
  }
  // Depo, sayfa yüklenmeden ÖNCE kurulmalı: uygulama ilk render'da okumaya başlıyor.
  // ÇEVRİMDIŞI KİLİT (v1.556.1) testlerde kapalı: senaryolar ağsız koşuyor (bulut istekleri hep düşüyor).
  // Kilidin kendisini ölçen senaryo `cevrimdisiKilidi: true` verir.
  if (!cevrimdisiKilidi) await sayfa.addInitScript(() => { window.__cevrimdisiSerbest = true; });
  // TANIMLAR BAŞLIKLARI (v1.588.0) kapalı başlıyor; senaryolar bölüm içine doğrudan dokunduğu için testte hepsi açık.
  // Açılır davranışı ölçen senaryo `tanimBasliklariKapali: true` verir.
  if (!tanimBasliklariKapali) await sayfa.addInitScript(() => { window.__tanimBasliklariAcik = true; });
  // REÇETE ONAY KAPISI (v1.634.0) testlerde açık: tohum reçeteleri bilerek eksik (kapsam uyarılarını ölçüyorlar) ve
  // eski senaryolar üretimi onaysız açıyor. Kapının kendisini ölçen senaryo `receteOnayKapisi: true` verir.
  if (!receteOnayKapisi) await sayfa.addInitScript(() => { window.__receteOnaySerbest = true; });
  // KURULUM SİHİRBAZI (v1.644.0) testlerde kapalı: tohumların çoğu boş tanımla açılıyor. Sihirbazı ölçen senaryo `kurulumSihirbazi: true`.
  if (!kurulumSihirbazi) await sayfa.addInitScript(() => { window.__kurulumSihirbaziKapali = true; });
  // FİRMA KAPISI (v1.643.0): seçimsiz cihazda uygulama firma kodu ekranında durur. Senaryolar ana projeyle seçili açılır
  // (yalnız yoksa yazılır: firma değiştiren senaryonun yeniden yüklemeden sonraki seçimi ezilmesin). Kapının kendisini
  // ölçen senaryo `firmaSecili: false` verir.
  if (firmaSecili) await sayfa.addInitScript(() => {
    if (!localStorage.getItem("firma:secim")) localStorage.setItem("firma:secim", JSON.stringify({ kod: "nds", url: "https://mqdgucoomgqcvhvgixbl.supabase.co", anahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2" }));
  });
  await sayfa.addInitScript((veri) => {
    const kutu = { ...veri };
    window.__depo = kutu;
    window.storage = {
      async get(a) { if (!(a in kutu)) throw new Error("bulunamadı: " + a); return { key: a, value: kutu[a], shared: true }; },
      async set(a, d) { kutu[a] = String(d); return { key: a, value: String(d), shared: true }; },
      async delete(a) { delete kutu[a]; return { key: a, deleted: true, shared: true }; },
      async list(on = "") { return { keys: Object.keys(kutu).filter((k) => k.startsWith(on)), prefix: on, shared: true }; },
    };
  }, tohum);
  if (onceRota) await onceRota(sayfa);
  // HTML yolu değiştirilebilir: refaktör ÖNCESİ ve SONRASI paketleri aynı senaryoyla karşılaştırmak için.
  await sayfa.goto(adres || ("file://" + (process.env.TEST_HTML || path.join(__dirname, "test.html"))));
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  // AÇILIŞIN BİTMESİNİ BEKLE (v1.560.0): senaryolar açılıştan sonra SABİT süre (2–2,5 sn) bekliyordu. Bulut
  // denemelerinin düşme süresi ortama göre oynayınca (aynı paket bir koşuda 2 sn, öbüründe 3 sn) "Yükleniyor…"
  // hâlâ ekrandayken menüye tıklanıp senaryo yanlış yere gidiyordu. Yükleme ekranını ölçen senaryo `yuklemeyiBekle: false`.
  if (yuklemeyiBekle) {
    await sayfa.waitForFunction(() => document.body && !document.body.innerText.includes("Yükleniyor"), null, { timeout: 20000 }).catch(() => {});
  }
  return { tarayici, sayfa };
}

// Depodaki bir anahtarı JSON olarak okur — testin "sonuç" tarafı budur.
const depoOku = (sayfa, anahtar) => sayfa.evaluate((a) => {
  const d = window.__depo[a];
  return d === undefined ? null : JSON.parse(d);
}, anahtar);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// MODÜL AÇ (v1.449.0): yan menü kalktı, modüller üst menünün AÇILIR listelerinde. Liste kapalıyken
// düğme görünmez ama DOM'da (`data-nav`); testler modüle adıyla doğrudan gidiyor, menüyü açıp
// kapatmak senaryonun konusu değil.
const modulAc = async (sayfa, ad) => {
  const bulundu = await sayfa.evaluate((a) => {
    const b = document.querySelector(`[data-nav="${a}"]`);
    if (b) b.click();
    return !!b;
  }, ad);
  if (!bulundu) throw new Error(`Menüde "${ad}" yok`);
};

// CARİ SEÇ (v1.620.0): sipariş formundaki müşteri/tedarikçi kutusu artık aramalı (CariSecici). Kutuya yazıp öneriye
// dokunur. `kok`: birden çok form açıksa daraltmak için seçici (varsayılan: görünen ilk kutu).
// `alan` (v1.622.0): fiş / kasa / çek formlarındaki kutuların veri adı (data-fis-cari, data-kasa-cari, data-cek-cari).
const cariSec = async (sayfa, unvan, kok = "", alan = "data-siparis-cari") => {
  const kutu = sayfa.locator(`${kok} input[${alan}]:visible`).first();
  await kutu.click();
  await kutu.fill(unvan);
  await sayfa.waitForTimeout(150);
  await sayfa.locator(`[data-cari-secenek="${unvan}"]`).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(200);
};

module.exports = { uygulamaAc, depoOku, bekle, modulAc, cariSec };

// SAĞ TIK MENÜSÜ (v1.636.0): `secici`ye sağ tık olayı gönderir (öğe başka bir katmanın altında kalsa da React işleyicisi
// çalışır), ardından menüden `oge`yi (data-sag-tik) seçer. Menü açılmazsa ya da öğe yoksa false döner.
async function sagTikAc(sayfa, secici) {
  if (await sayfa.locator("[data-sag-tik-menusu]").count()) { await sayfa.keyboard.press("Escape"); await sayfa.waitForTimeout(150); }
  return sayfa.evaluate((sec) => {
    const el = [...document.querySelectorAll(sec)].find((x) => x.getBoundingClientRect().width > 0) || document.querySelector(sec);
    if (!el) return false;
    const b = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: b.left + Math.min(20, b.width / 2), clientY: b.top + Math.min(10, b.height / 2) }));
    return true;
  }, secici);
}
async function sagTikSec(sayfa, secici, oge) {
  // Açık kalmış eski menü varsa önce kapanır (yoksa onun öğesi seçilirdi).
  if (await sayfa.locator("[data-sag-tik-menusu]").count()) { await sayfa.keyboard.press("Escape"); await sayfa.waitForTimeout(150); }
  if (!(await sagTikAc(sayfa, secici))) return false;
  await sayfa.waitForTimeout(250);
  const o = sayfa.locator(`[data-sag-tik-menusu] [data-sag-tik="${oge}"]`).last();
  if (!(await o.count()) || (await o.isDisabled())) { await sayfa.keyboard.press("Escape"); return false; }
  await o.click();
  await sayfa.waitForTimeout(300);
  return true;
}
module.exports.sagTikAc = sagTikAc;
module.exports.sagTikSec = sagTikSec;
