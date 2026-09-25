// SENARYO — BARKODLA SİPARİŞ: fuar akışının uçtan uca hâli.
//
// Kullanıcı: "Sipariş giriş ekranında barkod okut bölümü olsun ve okutulan ürün asorti kadar
// eklensin." Ve (5 Eylül): "Barkod hep 90 ile başlasın. Renk, beden, stok hepsinin arka planda
// kodu olsun."
//
// Ölçülen zincir: kodlar atanıyor → koddan barkod kuruluyor → OKUTULUNCA sipariş kalemi oluyor.
// Birim testi (birim-barkod-semasi.js) kodun çözüldüğünü ölçüyor; bu senaryo asıl soruyu ölçüyor:
// gerçek tarayıcıda, gerçek ekranda okutunca sipariş satırı gerçekten doğuyor mu.
//
// Dört seviyenin ikisi kalem üretiyor (asorti, tek çift), ikisi ÜRETMEMELİ (stok, renk) —
// "hangi renk/hangi beden" belli değilken satır yazmak, karşılığı üretilemeyecek sipariş demek.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };

  // Kullanıcının kendi örneği: "125 model siyah renk 36:1, 37:2, 38:2, 39:2, 40:1 — toplam 8 çift."
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [
    { id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" },
    { id: "b39", ad: "39" }, ...tan.bedenler,
  ];
  tan.asortiler = [{
    id: "as1", ad: "Standart 8li",
    oranlar: [{ beden: "36", oran: 1 }, { beden: "37", oran: 2 }, { beden: "38", oran: 2 },
      { beden: "39", oran: 2 }, { beden: "40", oran: 1 }],
  }];
  t["tanimlar:data"] = JSON.stringify(tan);

  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: 10 })),
    hareketler: [], recete: [], birimFiyat: 465,
  });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- 1. KODLARI ATA (Paketleme ekranındaki toplu düğme) -------------------------------------
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);

  const stokSonrasi = await depoOku(sayfa, "stok:items");
  const tanimSonrasi = await depoOku(sayfa, "tanimlar:data");
  const urun = (stokSonrasi || []).find((u) => u.id === "m125");
  const renkKod = ((tanimSonrasi.renkler || []).find((r) => r.ad === "Siyah") || {}).barkodKodu;
  const asortiKod = ((tanimSonrasi.asortiler || []).find((a) => a.id === "as1") || {}).barkodKodu;
  const beden38 = ((tanimSonrasi.bedenler || []).find((b) => b.ad === "38") || {}).barkodKodu;

  const hane = (n, h) => String(n).padStart(h, "0");
  const kodStok = `90${hane(urun.stokNo, 4)}`;
  const kodRenk = `${kodStok}${hane(renkKod, 4)}`;
  const kodBeden = `${kodRenk}${hane(beden38, 2)}`;
  const kodAsorti = `${kodRenk}${hane(asortiKod, 3)}`;

  const kodlar = {
    stok: kodStok, renk: kodRenk, beden: kodBeden, asorti: kodAsorti,
    // Şemanın kendisi: dört seviye YALNIZCA uzunlukla ayrılıyor (seviye hanesi yok).
    uzunluklar: [kodStok.length, kodRenk.length, kodBeden.length, kodAsorti.length],
    hepsiRakam: [kodStok, kodRenk, kodBeden, kodAsorti].every((k) => /^\d+$/.test(k)),
  };

  // ---- 2. SİPARİŞ EKRANINDA OKUT --------------------------------------------------------------
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);
  // Müşteri seçilmeden sipariş kaydedilmiyor (form kuralı); fuar akışı da müşteriyle başlıyor.
  await sayfa.locator('select:has(option:text-is("Müşteri B"))').first().selectOption({ label: "Müşteri B" });
  await sayfa.waitForTimeout(400);

  // YERLEŞİM — Renk seçicisi DAR EKRANDA da okunabilir kalmalı. Sabit sütun oranlarıyla
  // (1.4fr 0.9fr 0.8fr) "+ Renk" düğmesi kırılmadığı için seçiciye ~50 px kalıyordu ve seçili
  // renk okunamıyordu (kullanıcı bildirdi, 6 Eylül). Alt sınır: 100 px.
  const dar = { width: 820, height: 1200 };
  const eskiGorunum = sayfa.viewportSize();
  await sayfa.setViewportSize(dar);
  await sayfa.waitForTimeout(400);
  await sayfa.locator('input[placeholder="Model ara…"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^125 Model/.test(x.textContent.trim()));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const renkSeciciGenisligi = await sayfa.evaluate(() => {
    const sel = [...document.querySelectorAll("select")]
      .find((s) => [...s.options].some((o) => o.textContent === "Seçin…"));
    return sel ? Math.round(sel.getBoundingClientRect().width) : 0;
  });
  const yerlesim = { renkSeciciOkunabilir: renkSeciciGenisligi >= 100 };
  if (eskiGorunum) await sayfa.setViewportSize(eskiGorunum);
  await sayfa.waitForTimeout(300);

  const kutu = sayfa.locator('input[title="Barkod"]:visible').first();
  const kalemSayisi = async () => sayfa.evaluate(() =>
    document.querySelectorAll('input[title^="Sipariş miktarı"], input[title^="Miktar"]').length);

  const okut = async (kod) => {
    await kutu.fill(kod);
    await kutu.press("Enter");
    await sayfa.waitForTimeout(600);
    return sayfa.evaluate(() => document.body.innerText);
  };

  // Renksiz/bedensiz kodlar KALEM ÜRETMEMELİ, sebebini söylemeli.
  const stokMetni = await okut(kodStok);
  const renkMetni = await okut(kodRenk);
  const seviyeUyarilari = {
    stokSeviyesiReddedildi: /renk\/beden içermiyor/.test(stokMetni),
    renkSeviyesiReddedildi: /beden içermiyor/.test(renkMetni),
  };

  // ASORTİ: tek okutma 8 çifti dağılımıyla ekliyor.
  await okut(kodAsorti);
  const asortiSonrasi = await sayfa.evaluate(() => document.body.innerText);

  // Aynı kodu tekrar okutmak KAT oluşturuyor (ayrı bir "kaç kat" kutusuna gerek yok).
  await okut(kodAsorti);

  // TEK ÇİFT: 12 haneli kod 38 numaraya bir çift ekliyor.
  await okut(kodBeden);

  // Tanınmayan kod sessizce yutulmamalı.
  await kutu.fill("909999000101");
  await kutu.press("Enter");
  // Bildirim BİR SANİYE SONRA da ekranda olmalı. Daha önce burada 200 ms'de kayboluyordu:
  // önceki bildirimin zamanlayıcısı yenisini siliyordu (showToast'ta düzeltildi).
  await sayfa.waitForTimeout(1000);
  const bilinmeyen = await sayfa.evaluate(() => document.body.innerText);

  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Siparişi Kaydet"):visible').first().click();
  await sayfa.waitForTimeout(1800);

  const siparisler = await depoOku(sayfa, "siparis:data");
  const yeni = (siparisler || []).find((sp) => (sp.kalemler || []).some((k) => k.urunId === "m125"));
  const kalemler = ((yeni && yeni.kalemler) || [])
    .filter((k) => k.urunId === "m125")
    .map((k) => ({ beden: k.beden, miktar: k.miktar }))
    .sort((a, b) => String(a.beden).localeCompare(String(b.beden), "tr", { numeric: true }));

  await tarayici.close();
  return {
    hatalar,
    kodlar,
    seviyeUyarilari,
    yerlesim,
    asortiMesaji: /8 çift eklendi/.test(asortiSonrasi),
    bilinmeyenKodReddedildi: /Tanınmayan barkod/.test(bilinmeyen),
    // İki asorti katı (36:2 37:4 38:4 39:4 40:2) + tek çift 38 = 38'de 5.
    kalemler,
    toplamCift: kalemler.reduce((n, k) => n + k.miktar, 0),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
