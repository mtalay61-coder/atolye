// ORTAK TEST YARDIMCILARI
// Uygulamayı gerçek Chromium'da çalıştırır. `window.storage` bellek içi sahte bir depoyla
// değiştirilir; uygulama Supabase'e ulaşamayınca yerel kopyaya düşer, böylece veri tohumlanabilir.
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

// `onceRota(sayfa)`: sayfa yüklenmeden ÖNCE ağ rotaları kurmak için (açılıştaki Supabase
// okumasını taklit etmek gerekiyorsa). Uygulama ilk render'da buluta gider; sonradan kurulan rota
// o istekleri yakalayamaz.
// `tarayiciArgs`: Chromium bayrakları — örn. sahte kamera (`--use-file-for-fake-video-capture`).
// `adres`: uygulamayı file:// yerine bu http(s) adresinden aç — çağıran `onceRota` ile o adresi
// test.html'e yönlendirir (sürüm dosyası gibi göreli okumalar yalnız http'de çalışıyor).
async function uygulamaAc(tohum = {}, { hataYaz = true, onceRota = null, tarayiciArgs = [], adres = null, cevrimdisiKilidi = false, yuklemeyiBekle = true, tanimBasliklariKapali = false, receteOnayKapisi = false, firmaSecili = true, kurulumSihirbazi = false, stkAyar = null } = {}) {
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
  // Ağ hatasında yeniden deneme (v1.724.1) senaryolarda beklemesiz: davranış aynı (3 deneme), aralar 20 ms — kopuk ağ
  // senaryoları (bekleyen yazma, çevrimdışı kilit) saniyeler beklemesin. Gerçek aralar birim testinde (birim-yazma-dayaniklilik).
  await sayfa.addInitScript(() => { window.__supabaseYenidenDenemeMs = [20, 20, 20]; });
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
  // KURAL PROVASI (v1.742.0, test/kural-provasi.js — `KURAL_PROVASI=1`): senaryo, fiş defteri kurulu ve bütün modülleri v2'de bir
  // sunucuya karşı koşar (ayar satırı verilmemişse); fis_kes / fis_iptal / fis_bilgi numara verir; Kasa & Banka'nın bulut hâli
  // tohumdan döner (taban kurulsun — yoksa kasa farkı hiç hesaplanmaz). Köprüden hareket satırıyla giden her yazma
  // `window.__eskiYolKaydi`na düşer (038 eskiYolKaydinaYaz), tarayıcı kapanırken PROVA_DIZIN'e yazılır. Senaryonun kendi rotaları
  // ÖNCE gelir (Playwright son kaydedileni önce dener: bunlar onceRota'dan önce kaydedilir).
  const prova = process.env.KURAL_PROVASI === "1";
  if (prova) {
    if (!stkAyar) stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true, liste_tablolari: ["fis_defteri"], fis_aktif: false };
    // Kancanın kendi sınaması: PROVA_FISSIZ=1 → fiş defteri KURULMAMIŞ v2 sunucu (eski yol çalışmalı ve kayda düşmeli).
    if (process.env.PROVA_FISSIZ === "1") { stkAyar = { ...stkAyar }; delete stkAyar.fis_aktif; }
    await sayfa.addInitScript(() => { window.__eskiYolKaydi = []; });
    let sira = 0;
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = (JSON.parse(r.request().postData() || "{}").p) || {};
      sira += 1;
      const no = `${(p.fis && p.fis.onek) || "PRV"}-261031${String(sira).padStart(3, "0")}`;
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: no, bagliFisNo: p.bagli ? `${(p.bagli.fis && p.bagli.fis.onek) || "PRV"}-261031${String(sira).padStart(3, "0")}B` : null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: ((JSON.parse(r.request().postData() || "{}").p) || {}).no, zatenIptal: false }) }));
    for (const ad of ["fis_bag_coz", "stk_renk_tasi"]) await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await sayfa.route("**/rest/v1/rpc/fis_bilgi**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: ((JSON.parse(r.request().postData() || "{}").p) || {}).no }) }));
    const mh = tohum["muhasebe:data"];
    if (mh) await sayfa.route("**/rest/v1/muhasebe?**", (r) => (r.request().method() === "GET"
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "tekil", veri: JSON.parse(mh) }]) }) : r.fallback()));
    const kapat = tarayici.close.bind(tarayici);
    tarayici.close = async () => {
      try {
        const kayit = await sayfa.evaluate(() => window.__eskiYolKaydi || []);
        const dizin = process.env.PROVA_DIZIN || "/tmp/kural-provasi";
        fs.mkdirSync(dizin, { recursive: true });
        const ad = path.basename(process.argv[1] || "senaryo", ".js");
        fs.appendFileSync(path.join(dizin, `${ad}.jsonl`), kayit.map((k) => JSON.stringify(k)).join("\n") + (kayit.length ? "\n" : ""));
      } catch (e) { /* sayfa kapanmış */ }
      return kapat();
    };
  }
  if (onceRota) await onceRota(sayfa);
  // v2 AYAR SATIRI (v1.730.1, 045 `v2AyarlariniOku`): gerçek Supabase'de `stk_ayar` ya vardır ya 404 döner (v2 kurulmamış). Sahte
  // sunucu bilmiyorsa "kurulmamış" yanıtı verilir — istek düşerse uygulama ayarı "bilinmiyor" sayıp bütün yazmaları bekletirdi.
  // onceRota'dan SONRA kaydedilir: Playwright son kaydedilen rotayı önce dener.
  // `stkAyar` (v1.732.0): v2 / fiş defteri kurulu bir sunucuyu taklit eden senaryo ayar satırını verir.
  await sayfa.route("**/rest/v1/stk_ayar**", (r) => (stkAyar
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([stkAyar]) })
    : r.fulfill({ status: 404, contentType: "application/json",
      body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.stk_ayar' in the schema cache" }) })));
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
  if (bulundu) return;
  // ÖDEME & TAHSİLAT ALANI (v1.645.11): Kasa & Banka ve Çek & Senet menüden kalktı, alanın sekme şeridinden açılır.
  const alanSekmesi = { "Kasa & Banka": "muhasebe", "Çek & Senet": "cekler" }[ad];
  if (alanSekmesi) {
    await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Ödeme & Tahsilat"]'); if (b) b.click(); });
    await sayfa.waitForSelector(`[data-odeme-alani-sekme="${alanSekmesi}"]`, { state: "visible", timeout: 5000 }).catch(() => {});
    const tamam = await sayfa.evaluate((t) => {
      const b = [...document.querySelectorAll(`[data-odeme-alani-sekme="${t}"]`)].find((x) => x.getBoundingClientRect().width > 0);
      if (b) b.click();
      return !!b;
    }, alanSekmesi);
    if (tamam) return;
  }
  throw new Error(`Menüde "${ad}" yok`);
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
