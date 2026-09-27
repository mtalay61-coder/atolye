// SENARYO — EFEKTLERDE BAYAT FONKSİYON (22 Eylül, v1.408.0, denetim 18 C)
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu. v1.413 zip'indeki asıl hâl tek ekran
// fişinden ve ONAY ADIMINDAN (v1.431.0) önceydi; Ctrl+S artık önce onay penceresini açıyor.)
//
// Kullanıcı "sen devam et" dedi; v1.407'de incelenmeden bırakılan efekt bulguları okununca iki
// gerçek hata çıktı. İkisinde de efekt, KURULDUĞU çizimdeki fonksiyonu SONRADAN çağırıyordu.
//
// Ölçülenler:
//   1. Stok fişi başlığındaki Kaydet / Ctrl+S: kalemden SONRA fiş no ve ödeme şekli değiştirilip
//      Ctrl+S'ye basılınca fiş GÜNCEL değerlerle kaydedilmeli (SONRADAN-NO + Havale/EFT). Eski
//      hata: efektin son çalıştığı çizimdeki `kaydet` → AF-… + Nakit. Stok hareketi ve cari
//      hareketi ikisi de ölçülüyor: fiş no iki yerde birden tutmalı.
//   2. Bekleyen yazmaları yeniden gönderme ("online" olayı): efekt kurulduktan sonra kesilen iki
//      fiş, bağlantı gelince yerel depodan SİLİNMEMELİ. Eski hata: efekt eski stok kopyasını
//      `tabloYaz` ile geri yazıyor, yeni fişler kayboluyordu (çevrimdışı çalışmanın silinmesi).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Ürün kutusu datalist'li arama; kutuya ürünün TAM etiketi yazılmalı (kategori/birim ekli olabilir).
async function urunEtiketiBul(sayfa, ad) {
  return sayfa.evaluate((a) => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value === a || x.value.includes(a)) : null;
    return o ? o.value : a;
  }, ad);
}

// Tedarikçi A kartını açık tutar; kart zaten açıksa tekrar tıklamaz.
async function tedarikciAc(sayfa) {
  if (await sayfa.locator('[data-cari-fis-ac="Alış"]:visible').count()) return;
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(400);
  await sayfa.locator('button:has-text("Tedarikçi A")').nth(1).click();
  await sayfa.waitForTimeout(400);
}

// Alış fişini açıp tek kalem (Deri · Siyah · miktar × 150 ₺) ekler; kaydetmez.
async function kalemliFisAc(sayfa, miktar) {
  await tedarikciAc(sayfa);
  await sayfa.locator('[data-cari-fis-ac="Alış"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-urun-arama]").first().fill(await urunEtiketiBul(sayfa, "Deri"));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("150");
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill(String(miktar));
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);
}

async function calistir() {
  const hatalar = [];
  const sonuc = { hatalar };

  // 1) BAŞLIK KAYDET / CTRL+S — değerler kalemden SONRA değişiyor.
  {
    const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    await sayfa.waitForTimeout(2200);
    await kalemliFisAc(sayfa, 3);
    // Kalem eklendikten sonra: fiş no ve ödeme şekli. Eski hatada efekt bunlara bağlı değildi.
    await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("SONRADAN-NO");
    const yeniOdeme = "Havale/EFT";
    await sayfa.locator('select:has(option:text-is("Havale/EFT")):visible').first().selectOption(yeniOdeme);
    await sayfa.waitForTimeout(300);
    // Odak fişin içinde; Ctrl+S eylem çubuğunun "kaydet"ini tetikler (352-eylem-cubugu).
    await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').focus();
    await sayfa.keyboard.press("Control+s");
    await sayfa.waitForTimeout(600);
    // ONAY ADIMI (v1.431.0): Ctrl+S de alttaki düğme gibi önce onay penceresini açar.
    const onayAcildi = await sayfa.locator("[data-fis-onay-evet]").count() > 0;
    if (onayAcildi) await sayfa.locator("[data-fis-onay-evet]").first().click();
    await sayfa.waitForTimeout(1500);
    const deri = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.ad === "Deri");
    const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.unvan === "Tedarikçi A");
    sonuc.baslikKaydet = {
      onayAcildi,
      beklenenOdeme: yeniOdeme,
      stokFisNo: ((deri && deri.hareketler) || []).filter((h) => h.miktar === 3).map((h) => h.fisNo),
      cariHareket: ((cari && cari.hareketler) || []).slice(-1).map((h) => ({ fisNo: h.fisNo, odeme: h.odemeSekli })),
    };
    await tarayici.close();
  }

  // 2) "ONLINE" OLAYI — efekt kurulduktan sonra kesilen fişler yerinde kalmalı.
  {
    const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    await sayfa.waitForTimeout(3000);
    for (const [no, miktar] of [["BIR", 3], ["IKI", 5]]) {
      await kalemliFisAc(sayfa, miktar);
      await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill(no);
      await sayfa.locator("[data-fis-kaydet]").first().click();
      await sayfa.waitForTimeout(600);
      await sayfa.locator("[data-fis-onay-evet]").first().click();
      await sayfa.waitForTimeout(1500);
    }
    const fisler = async () => ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.ad === "Deri") || {}).hareketler || [])
      .map((h) => h.fisNo).filter((f) => f === "BIR" || f === "IKI").sort();
    const cariFisleri = async () => ((((await depoOku(sayfa, "cari:data")) || []).find((c) => c.unvan === "Tedarikçi A") || {}).hareketler || [])
      .map((h) => h.fisNo).filter((f) => f === "BIR" || f === "IKI").sort();
    const once = { stok: await fisler(), cari: await cariFisleri() };
    await sayfa.evaluate(() => window.dispatchEvent(new Event("online")));
    await sayfa.waitForTimeout(2500);
    sonuc.baglantiGelince = { onlineOncesi: once, onlineSonrasi: { stok: await fisler(), cari: await cariFisleri() } };
    await tarayici.close();
  }
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
