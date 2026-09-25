// SENARYO — ONAY PANELİ AÇIKKEN SATIR EKLEME.
//
// Kullanıcı ekran görüntüsüyle sordu: "2. satırı nereden ekleyeceğim?" Ekranda onay paneli
// ("Şunu onaylıyor musunuz? Aşağıdaki ürünlerin stoğu değişecek") açıktı; altta duran onay düğmesi
// görsel olarak "iş bitti" diyordu ve üstteki "Kalem Ekle" düğmesi gözden kaçıyordu.
//
// Ölçülen: onay açıkken satır eklenebiliyor VE onay paneli kendiliğinden kapanıp düzenlemeye
// dönüyor (özet bayatlamış oluyor, ekranda kalması yanıltıcıydı).
// ORTAK FİŞ EKRANINA TAŞINDI (23 Eylül, v1.431.0): alış da tek ekranda; onay paneli artık fişin
// kendisinde (`data-fis-onay`). Ölçülen davranış aynı: onay açıkken satır eklenebiliyor ve onay
// kendiliğinden kapanıyor — bayat özetle "evet" dedirtmemek için.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push(
    { id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Lacivert", beden: "40", miktar: 5 }], hareketler: [], recete: [], birimFiyat: 465 },
    { id: "m2", ad: "SS Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Beyaz", beden: "40", miktar: 50 }], hareketler: [], recete: [], birimFiyat: 520 },
  );
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-1002", tip: "Alış", cariId: "c1", durum: "Onaylandı",
    tarih: "2026-08-25", teslimTarihi: "2026-09-10", teslimSayaci: 0,
    kalemler: [
      { id: "k1", urunId: "m1", urunAd: "125 Model", renk: "Lacivert", beden: "40", miktar: 13, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "k3", urunId: "m2", urunAd: "SS Model", renk: "Beyaz", beden: "40", miktar: 8, karsilanan: 0, birim: "çift", birimFiyat: 520, paraBirimi: "TRY" },
    ],
  }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Alış Siparişi");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1002" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const say = () => sayfa.locator("[data-fis-miktar]:visible").count();
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-ekle]").click());
  await sayfa.waitForTimeout(600);
  const ilkSatir = await say();

  // ONAY PANELİNİ AÇ
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  const onayAcildi = await sayfa.locator("[data-fis-onay-evet]").count();

  // Onay açıkken kalem eklemek MÜMKÜN olmalı: ekleme yolu (Kalemlere Ekle) görünür ve kilitli değil.
  const d = sayfa.locator("[data-kalemlere-ekle]:visible");
  const dugmeGorunur = await d.count();
  const dugmeKilitli = await d.first().isDisabled();

  // Bir kalem daha ekle → onay kapanmalı, satır sayısı artmalı.
  const botEtiketi = await sayfa.evaluate(() => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value.includes("Bot")) : null;
    return o ? o.value : "Bot";
  });
  await sayfa.locator("[data-urun-arama]").first().fill(botEtiketi);
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("1");
  await sayfa.waitForTimeout(200);
  await d.first().click();
  await sayfa.waitForTimeout(600);
  const ikinciSatir = await say();
  const onayKapandiMi = (await sayfa.locator("[data-fis-onay-evet]").count()) === 0;
  await tarayici.close();

  return {
    hatalar,
    ilkSatir,
    onayAcildi,
    kalemEkleDugmesi: { gorunur: dugmeGorunur, kilitli: dugmeKilitli },
    ikinciSatir,
    onayKendiliginenKapandi: onayKapandiMi,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
