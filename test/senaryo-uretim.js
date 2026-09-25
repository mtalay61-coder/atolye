// SENARYO — ÜRETİM KARTINDAN GERİ ALMA (`uretimProsesAtamaTeslimGeriAl` → `fisGeriAl`).
//
// Tohumda teslim alınmış bir üretim var: hammadde çıkışı (`1001-Kesim`), işçilik
// (`1001-Kesim-İşçilik`) ve mamul girişi (`1001-Kesim-Giriş`). Kart üzerinden "geri al" denince
// üçünün de geri alınması, üretim ilerlemesinin sıfırlanması ve mamulün stoktan düşmesi bekleniyor.
//
// Bu yol artık TEK yol: aynı fişler Fişler ekranından ve cari ekstresinden kilitli (v1.46.0).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ÖNCE KİLİT: aynı fişler Fişler ekranından silinemiyor olmalı.
  await sayfa.getByRole("button", { name: "Fişler", exact: true }).click();
  await sayfa.waitForTimeout(800);
  // Silme düğmesi fişin AÇILMIŞ hâlinde görünüyor — önce fişi aç.
  await sayfa.getByText("1001-Kesim", { exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  // İŞLEMLER MENÜSÜ (18 Eylül): sil/kilit rozeti artık bu menünün içinde.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-fis-islemler]")].find((x) => x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const fislerEkrani = await sayfa.evaluate(() => {
    const g = (e) => e.getBoundingClientRect().width > 0;
    const metin = document.body.innerText;
    return {
      kilitRozeti: /Üretimden geri alınır/.test(metin),
      silDugmesi: [...document.querySelectorAll("button")].filter(g)
        .some((b) => /^(Sil|Bu Fişi Temizle)$/.test((b.textContent || "").trim())),
    };
  });

  await sayfa.getByRole("button", { name: "Üretim", exact: true }).click();
  await sayfa.waitForTimeout(600);
  await sayfa.getByText("1001", { exact: true }).last().click();
  await sayfa.waitForTimeout(700);
  // Adım satırındaki "detay / geri al" açılır, ardından atamanın "Geri Al" düğmesi.
  await sayfa.getByText("detay / geri al", { exact: false }).last().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Geri Al")').last().click();
  await sayfa.waitForTimeout(1500);

  const stok = await depoOku(sayfa, "stok:items");
  const cariler = await depoOku(sayfa, "cari:data");
  const uretim = await depoOku(sayfa, "uretim:siparisler");
  await tarayici.close();

  return {
    hatalar,
    fislerEkrani,
    stok: (stok || []).map((p) => ({
      ad: p.ad,
      variants: p.variants.map((v) => ({ renk: v.renk, beden: v.beden, miktar: v.miktar })),
      fisler: (p.hareketler || []).map((h) => h.fisNo),
    })),
    cariler: (cariler || []).map((c) => ({ unvan: c.unvan, fisler: (c.hareketler || []).map((h) => h.fisNo) })),
    uretim: (uretim || []).map((u) => ({
      no: u.siparisNo, asama: u.asama, stogaEklendiMi: u.stogaEklendiMi,
      prosesler: (u.prosesIlerleme || []).map((p) => ({
        proses: p.proses, verildiMi: p.verildiMi, tamamlandiMi: p.tamamlandiMi,
        atamalar: (p.atamalar || []).map((a) => ({ miktar: a.miktar, tamamlandiMi: a.tamamlandiMi })),
      })),
    })),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    const sirasiz = require("crypto").createHash("sha256")
      .update(normalles(s, false)).digest("hex").slice(0, 12);
    console.log(normalles(s));
    console.log("sırasız özet: " + sirasiz);
  });
}

module.exports = { calistir };
