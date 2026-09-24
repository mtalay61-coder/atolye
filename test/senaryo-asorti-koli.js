// SENARYO — ASORTİLİ KOLİLER (kullanıcı, 19 Eylül: "standart asorti seçip tüm adetleri bu şekilde
// koli yap dendiğinde adedi asortileyip artan adetler boşta kalacak şekilde asorti oluştursun" +
// düzeltme: "kalanların hepsini tek koliye koyuyor, aslında asorti şeklinde KOLİLERE koyması
// gerekli").
//
// HESAP: her beden için kalan / o bedenin oranı → EN KÜÇÜĞÜ tam set sayısıdır. HER SET AYRI KOLİ.
//
// TEST VERİSİ NOTU: paketleme üretimi `bedenMiktarlari` alanından okuyor (`bedenDagilimi` değil).
// İlk denemede bu yüzden satırlar hiç çizilmemişti — senaryonun kendisi yanlış alanı yazıyordu,
// uygulamada sorun yoktu.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  // 40:2, 41:3 oranlı set. Kalanlar 40→7, 41→12: 7/2=3, 12/3=4 → EN KÜÇÜK 3 set.
  // Beklenen: 3 koli, her birinde 40'tan 2 + 41'den 3; 40'ta 1, 41'de 3 adet boşta kalır.
  tan.asortiler = [{ id: "as1", ad: "Asorti 5 li", oranlar: [{ beden: "40", oran: 2 }, { beden: "41", oran: 3 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  t["siparis:data"] = JSON.stringify([{
    id: "sp99", siparisNo: "SAT-9099", tip: "Satış", cariId: "c2", cariAd: "Müşteri B",
    tarih: "2026-09-18", durum: "Hazırlanıyor",
    kalemler: [{ id: "kk1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 7,
      birimFiyat: 900, paraBirimi: "TRY", karsilanan: 0, planlama: { tip: "Üretim", referansNo: "10099" } }],
  }]);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "uas", siparisNo: "10099", model: "Bot", urunId: "u2", renk: "Siyah",
    durum: "Tamamlandı", tarih: "2026-09-19",
    bedenMiktarlari: [{ beden: "40", miktar: 7 }, { beden: "41", miktar: 12 }],
    prosesIlerleme: [],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Paketleme"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-yeni-koli]:visible").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('input[title="Sipariş / üretim no"]:visible').fill("10099");
  await sayfa.locator("[data-kaynak-getir]:visible").click();
  await sayfa.waitForTimeout(900);

  // KAYNAK KÜNYESİ (19 Eylül): üretimden gelindiğinde bile sipariş no ve müşteri görünmeli.
  const kunye = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-paketleme-kunye]");
    return k ? k.innerText.replace(/\n/g, " · ") : null;
  });

  const once = await sayfa.evaluate(() => ({
    satirVar: document.querySelectorAll('input[title="Koliye eklenecek adet"]').length > 0,
    dugmeVar: document.querySelectorAll("[data-tumunu-asortile]").length > 0,
  }));

  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => /Asorti 5 li/.test(o.textContent)));
    if (!s) return;
    const o = [...s.options].find((x) => /Asorti 5 li/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-tumunu-asortile]:visible").first().click();
  await sayfa.waitForTimeout(1200);

  const koliler = await depoOku(sayfa, "koli:data");
  const sonuc = {
    koliSayisi: (koliler || []).length,
    // Her koli TEK SET olmalı: 40'tan 2, 41'den 3.
    herKoliBirSet: (koliler || []).every((k) => {
      const a40 = (k.kalemler || []).find((x) => x.beden === "40");
      const a41 = (k.kalemler || []).find((x) => x.beden === "41");
      return a40 && a41 && a40.adet === 2 && a41.adet === 3;
    }),
    toplamKolilenen: (koliler || []).reduce((t2, k) => t2 + (k.kalemler || []).reduce((s2, x) => s2 + x.adet, 0), 0),
  };

  // TOPLU YAZDIRMA VE DEPO GÖRÜNÜMÜ (19 Eylül): 3 koli kurulduktan sonra hepsi seçilip tek
  // seferde yazdırılabilmeli; "Depoda" çipinde "adet × koli" özeti çıkmalı.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Vazgeç/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim().startsWith("Depoda")); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const depo = await sayfa.evaluate(() => {
    const o = document.querySelector("[data-depo-ozeti]");
    return {
      ozet: o ? o.innerText.replace(/\n/g, " ").slice(0, 110) : null,
      secimKutulari: document.querySelectorAll("[data-koli-sec]").length,
    };
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-koli-tumunu-sec]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const topluYazdir = await sayfa.evaluate(() => {
    const b = document.querySelector("[data-toplu-yazdir]");
    return b ? b.textContent.trim() : null;
  });

  await tarayici.close();
  return { hatalar, kunye, once, sonuc, depo, topluYazdir };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
