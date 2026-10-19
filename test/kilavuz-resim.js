// KILAVUZ EKRAN GÖRÜNTÜLERİ (v1.711 — kullanıcı: "kılavuz daha detaylı olsun, resimli olsun").
// Uygulamayı sanal veriyle (uçtan uca senaryonun tohumu + kasa, çek, planlama) açar, her ekranı gezip `kilavuz/<ad>.jpg`
// olarak kaydeder. Kılavuz (271) bu dosyaları göreli adresten okur: uygulama ve `kilavuz/` klasörü aynı yerde yayınlanır.
// Yeniden üretmek: `cd test && node derle.js && node paket-test.js && node kilavuz-resim.js`. Ekran değişince tekrar koşulur.
const fs = require("fs");
const path = require("path");
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const HEDEF = path.join(__dirname, "..", "kilavuz");

function tohumKur() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }, { id: "p2", ad: "Saya", sira: 2 }, { id: "p3", ad: "Kalfa", sira: 3 }];
  tan.araProsesler = [{ id: "ap1", ad: "Kampre", cariId: "c6", ucret: 3 }];
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), unvan: "Örnek Ayakkabı" };
  tan.kapasite = { makineler: [{ id: "m1", ad: "Kesim Makinesi", prosesler: ["Kesim"], adet: 3, gunlukSaat: 9, saatlikAdet: "" }],
    kaliplar: [{ id: "k1", ad: "27080 kalıbı", tur: "Kalıp", makineId: "m1", bedenSaatlik: { "40": 40, "41": 36, "42": 32 } }],
    elemanlar: [{ cariId: "c3", prosesler: ["Kesim"], baslangic: "08:00", bitis: "18:00", molaDk: 60, saatlikAdet: 30 }], prosesHedefleri: { Kesim: 300 } };
  t["tanimlar:data"] = JSON.stringify(tan);
  const v = (renk, beden, miktar) => ({ renk, beden, miktar });
  const r = (proses, hid, had, renk, beden, mamulBeden, miktar, birim) =>
    ({ proses, hammaddeUrunId: hid, hammaddeAd: had, renk, beden, mamulRenk: "Siyah", mamulBeden, miktar, birim });
  t["stok:items"] = JSON.stringify([
    { id: "u1", kategori: "Hammadde", ad: "Deri", birim: "metre", alisFiyati: 50, variants: [v("Siyah", "", 100), v("Kahve", "", 40)], recete: [], hareketler: [] },
    { id: "u5", kategori: "Hammadde", ad: "Taban", birim: "çift", alisFiyati: 20, variants: [v("Siyah", "40", 50), v("Siyah", "41", 50), v("Siyah", "42", 30)], recete: [], hareketler: [] },
    { id: "u2", kategori: "Mamul", ad: "Bot", kod: "27080", birim: "çift", variants: [v("Siyah", "40", 6), v("Siyah", "41", 4), v("Siyah", "42", 2)], hareketler: [],
      recete: [r("Kesim", "u1", "Deri", "Siyah", "", "Tüm Bedenler", 2, "metre"), r("Kalfa", "u5", "Taban", "Siyah", "40", "40", 1, "çift"), r("Kalfa", "u5", "Taban", "Siyah", "41", "41", 1, "çift"), r("Kalfa", "u5", "Taban", "Siyah", "42", "42", 1, "çift")],
      receteEkProsesler: ["Saya"], prosesUcretleri: { Kesim: 10, Saya: 20, Kalfa: 15 }, araProsesEklentileri: { Kesim: ["ap1"] },
      kapasite: { Kesim: { makineId: "m1", kalipIdler: ["k1"] } } },
  ]);
  t["cari:data"] = JSON.stringify([
    { id: "c1", unvan: "Deri Tedarik A.Ş.", tip: "Tedarikçi", hareketler: [] },
    { id: "c2", unvan: "Müşteri B", tip: "Müşteri", telefon: "0532 000 00 00", hareketler: [
      { id: "h1", tarih: "2026-10-01", yon: "Borç", tutar: 1200, paraBirimi: "TRY", fisNo: "SAT-1001", aciklama: "Satış", defter: "Genel" },
      { id: "h2", tarih: "2026-10-05", yon: "Alacak", tutar: 500, paraBirimi: "TRY", fisNo: "THS-1", aciklama: "Tahsilat (TL Kasa)", defter: "Genel" }] },
    { id: "c3", unvan: "Kesimci Ali", tip: "Personel", bagliProsesler: ["Kesim"], barkodKodu: "PRS-1", hareketler: [] },
    { id: "c4", unvan: "Sayacı Veli", tip: "Personel", altTip: "Fasoncu", bagliProsesler: ["Saya"], hareketler: [] },
    { id: "c5", unvan: "Kalfacı Ayşe", tip: "Personel", bagliProsesler: ["Kalfa"], hareketler: [] },
    { id: "c6", unvan: "Kampreci", tip: "Personel", altTip: "Fasoncu", hareketler: [] },
  ]);
  const k = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 200, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-1002", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-19", teslimTarihi: "2026-11-05", not: "",
      kalemler: [k("a", "Siyah", "40", 12), k("b", "Siyah", "41", 8), k("c", "Siyah", "42", 6)] },
    { id: "s2", siparisNo: "SAT-1003", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-18", teslimTarihi: "2026-11-10", not: "",
      kalemler: [k("d", "Siyah", "41", 10)] },
  ]);
  const adim = (proses, ek) => ({ proses, sira: 1, tamamlandiMi: false, personelId: null, atamalar: [], ...ek });
  t["uretim:siparisler"] = JSON.stringify([
    { id: "ur1", siparisNo: "10040", takipKodu: "10040", model: "Bot", urunId: "u2", renk: "Siyah", adet: 20, bedenMiktarlari: [{ beden: "40", miktar: 12 }, { beden: "41", miktar: 8 }],
      beden: "Siyah · 40:12, 41:8", rezervasyonSiparisId: "s1", asama: "Kesim", durum: "Devam", olusturuldu: "2026-10-19T08:00:00.000Z",
      prosesPlani: { Saya: { sira: 1, tarih: "2026-10-19", personelId: "c4" } },
      prosesIlerleme: [adim("Kesim"), adim("Kampre", { araProsesMi: true, araProsesId: "ap1", araProsesCariId: "c6" }), adim("Saya"), adim("Kalfa")] },
    { id: "ur2", siparisNo: "10039", takipKodu: "10039", model: "Bot", urunId: "u2", renk: "Siyah", adet: 10, bedenMiktarlari: [{ beden: "41", miktar: 10 }],
      beden: "Siyah · 41:10", rezervasyonSiparisId: "s2", asama: "Saya", durum: "Devam", olusturuldu: "2026-10-18T08:00:00.000Z",
      prosesIlerleme: [adim("Kesim", { tamamlandiMi: true, atamalar: [{ id: "at1", personelId: "c3", miktar: 10, bedenMiktarlari: { "41": 10 }, barkod: "10039", verildiMi: true, tamamlandiMi: true,
        verilmeTarihi: "2026-10-18", tamamlanmaTarihi: "2026-10-19T09:00:00.000Z", sonuc: { saglam: { "41": 10 }, tamir: [], hurda: [] } }] }),
        adim("Kampre", { araProsesMi: true, araProsesId: "ap1", araProsesCariId: "c6", tamamlandiMi: true }), adim("Saya"), adim("Kalfa")] },
  ]);
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [{ id: "m0", tarih: "2026-10-01", yon: "Giriş", tutar: 15000, aciklama: "Açılış", defter: "Genel" },
      { id: "m1", tarih: "2026-10-05", yon: "Giriş", tutar: 500, aciklama: "Tahsilat · Müşteri B", defter: "Genel" }] }],
    bankalar: [{ id: "bnk1", ad: "Ziraat TL", paraBirimi: "TRY", hareketler: [{ id: "b0", tarih: "2026-10-01", yon: "Giriş", tutar: 42000, aciklama: "Açılış", defter: "Genel" }] }],
    cekler: [{ id: "ck1", durum: "Portföyde", tip: "Alınan", cekNo: "000111", cariId: "c2", tutar: 8000, paraBirimi: "TRY", vadeTarihi: "2026-12-15", banka: "İş Bankası", gecmis: [] }],
  });
  return t;
}

async function main() {
  fs.mkdirSync(HEDEF, { recursive: true });
  const { tarayici, sayfa } = await uygulamaAc(tohumKur(), { hataYaz: false });
  await sayfa.setViewportSize({ width: 1280, height: 820 });
  await sayfa.waitForTimeout(2500);
  // Test ortamı bulutsuz: "buluta gönderilemedi / yerel kopya" şeritleri kılavuz görüntüsüne girmesin.
  await sayfa.addStyleTag({ content: '[data-bekleyen-yazma], [data-yazma-hatasi], span[title^="Bulut okunamadı"], [data-toast] { display: none !important; }' });
  const sonuc = [];
  // Metni tam eşleşen yaprak öğeyi bulup tıklanabilir üst öğesine basar (kart başlıkları düğme içinde metin parçası).
  const ac = async (metin) => { await sayfa.evaluate((ad) => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
    if (el) el.click();
  }, metin); await bekle(900); };
  const tikla = (metin) => sayfa.evaluate((m) => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && x.innerText.trim().startsWith(m)); if (b) b.click(); return !!b; }, metin);
  const sec = (sel) => sayfa.evaluate((s) => { const b = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().width > 0); if (b) b.click(); return !!b; }, sel);
  const bekle = (ms = 700) => sayfa.waitForTimeout(ms);
  const cek = async (ad, { yukseklik = 820, kaydir = null } = {}) => {
    if (kaydir) await sayfa.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().width > 0); if (e) e.scrollIntoView({ block: "start" }); }, kaydir);
    await bekle(400);
    await sayfa.screenshot({ path: path.join(HEDEF, `${ad}.jpg`), type: "jpeg", quality: 78, clip: { x: 0, y: 0, width: 1280, height: yukseklik } });
    sonuc.push(ad);
  };
  const adimlar = [
    ["anasayfa", async () => { await modulAc(sayfa, "Anasayfa"); await bekle(900); await cek("anasayfa"); }],
    ["siparis-liste", async () => { await modulAc(sayfa, "Sipariş"); await bekle(900); await cek("siparis-liste"); }],
    ["siparis-form", async () => { await tikla("Yeni Sipariş"); await bekle(900); await cek("siparis-form"); await sayfa.keyboard.press("Escape"); await bekle(300); }],
    ["planlama", async () => { await modulAc(sayfa, "Planlama"); await bekle(900); await cek("planlama"); }],
    ["proses-planlama", async () => { await sec('[data-planlama-alt="proses"]'); await bekle(600); await sec('[data-proses-sekme="Saya"]'); await bekle(500); await cek("proses-planlama"); }],
    ["uretim-liste", async () => { await modulAc(sayfa, "Üretim"); await bekle(900); await cek("uretim-liste"); }],
    ["uretim-kart", async () => { await ac("10040"); await cek("uretim-kart", { kaydir: "[data-uretim-kart-serit]" }); }],
    ["uretim-teslim", async () => {
      await modulAc(sayfa, "Üretim"); await bekle(700);
      await ac("10039");
      // Saya'ya iş ver (Sayacı) → teslim formu görünsün
      await sayfa.evaluate(() => { const sel = [...document.querySelectorAll("select")].find((s) => s.getBoundingClientRect().width > 0 && [...s.options].some((o) => o.text === "⚠ Personel seçin"));
        if (sel) { const o = [...sel.options].find((x) => /Sayacı/.test(x.text)); if (o) { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(sel, o.value); sel.dispatchEvent(new Event("change", { bubbles: true })); } } });
      await bekle(200); await tikla("İşi Ver"); await bekle(1200);
      await cek("uretim-teslim", { kaydir: "[data-teslim-al]" });
    }],
    ["atolye-ekrani", async () => {
      await modulAc(sayfa, "Üretim"); await bekle(600); await tikla("Barkod Okut"); await bekle(600);
      const kutu = sayfa.locator('input[title="Barkod"]'); await kutu.fill("PRS-1"); await kutu.press("Enter"); await bekle(800);
      await cek("atolye-ekrani"); await sayfa.keyboard.press("Escape"); await bekle(300);
    }],
    ["uretim-raporu", async () => { await modulAc(sayfa, "Üretim Raporu"); await bekle(900); await sec('[data-rapor-donem="ay"]'); await bekle(500); await cek("uretim-raporu"); }],
    ["stok", async () => { await modulAc(sayfa, "Stok"); await bekle(900); await cek("stok"); }],
    ["urun-karti", async () => { await modulAc(sayfa, "Ürün Stok"); await bekle(900); await ac("Bot"); await cek("urun-karti"); }],
    ["recete", async () => { await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /^Reçete/.test(x.innerText.trim())); if (b) b.click(); }); await bekle(800); await cek("recete"); }],
    ["maliyet", async () => { await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /^Maliyet$/.test(x.innerText.trim())); if (b) b.click(); }); await bekle(800); await cek("maliyet", { kaydir: "[data-urun-maliyet]" }); }],
    ["urun-stok", async () => { await modulAc(sayfa, "Ürün Stok"); await bekle(900); await cek("urun-stok"); }],
    ["sevkiyat", async () => { await modulAc(sayfa, "Sevkiyat"); await bekle(900); await sec('[data-sevk-et="SAT-1002"]'); await bekle(900); await cek("sevkiyat"); }],
    ["alis-satis", async () => { await modulAc(sayfa, "Alış / Satış"); await bekle(900); await cek("alis-satis"); }],
    ["depo", async () => { await modulAc(sayfa, "Depo"); await bekle(900); await cek("depo"); }],
    ["cari-liste", async () => { await modulAc(sayfa, "Cari"); await bekle(900); await cek("cari-liste"); }],
    ["cari-kart", async () => { await sayfa.locator('button:has-text("Müşteri B"):visible').last().click(); await bekle(900); await cek("cari-kart"); }],
    ["odeme-tahsilat", async () => { await modulAc(sayfa, "Ödeme & Tahsilat"); await bekle(900); await sec('[data-odeme-tip="Tahsilat"]'); await bekle(400); await cek("odeme-tahsilat"); }],
    ["kasa-banka", async () => { await modulAc(sayfa, "Kasa & Banka"); await bekle(900); await cek("kasa-banka"); }],
    ["cek-senet", async () => { await modulAc(sayfa, "Çek & Senet"); await bekle(900); await cek("cek-senet"); }],
    ["fisler", async () => { await modulAc(sayfa, "Fişler"); await bekle(900); await cek("fisler"); }],
    ["gelir-gider", async () => { await modulAc(sayfa, "Gelir / Gider"); await bekle(900); await sayfa.evaluate(() => document.querySelectorAll('[data-gg-grup][data-acik="0"]').forEach((b) => b.click())); await bekle(500); await cek("gelir-gider"); }],
    ["finans-raporu", async () => { await modulAc(sayfa, "Finans Raporu"); await bekle(900); await cek("finans-raporu"); }],
    ["tanimlar-urun", async () => { await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await bekle(800); await sec('[data-tanim-sekme="urun"]'); await bekle(600); await cek("tanimlar-urun"); }],
    ["tanimlar-uretim", async () => { await sec('[data-tanim-sekme="uretim"]'); await bekle(600); await cek("tanimlar-uretim"); }],
    ["tanimlar-kapasite", async () => { await sec('[data-tanim-sekme="kapasite"]'); await bekle(600); await cek("tanimlar-kapasite"); }],
    ["tanimlar-kullanicilar", async () => { await sec('[data-tanim-sekme="kullanicilar"]'); await bekle(600); await cek("tanimlar-kullanicilar"); }],
    ["tanimlar-yedek", async () => { await sec('[data-tanim-sekme="yedek"]'); await bekle(600); await cek("tanimlar-yedek"); }],
    ["kilavuz", async () => { await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Kılavuz"]'); if (b) b.click(); }); await bekle(800); await cek("kilavuz"); }],
  ];
  const hatalar = [];
  for (const [ad, f] of adimlar) {
    try { await f(); } catch (e) { hatalar.push(`${ad}: ${String(e.message).split("\n")[0].slice(0, 120)}`); }
  }
  await tarayici.close();
  console.log("üretildi:", sonuc.join(", "));
  if (hatalar.length) console.log("HATA:", hatalar.join("\n  "));
  const toplam = fs.readdirSync(HEDEF).filter((f) => f.endsWith(".jpg")).reduce((t, f) => t + fs.statSync(path.join(HEDEF, f)).size, 0);
  console.log(`toplam ${Math.round(toplam / 1024)} KB`);
}
main();
