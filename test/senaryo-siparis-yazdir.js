// SENARYO — BELGELERDE DOĞRUDAN YAZDIRMA (24 Eylül, v1.441.0).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "Sipariş doğrudan yazdırma yok, PDF var. Yazdırma ekle."
// Paylaş şeridine (`PaylasSeridi`, 075) "Yazdır" düğmesi kondu: `belgeyiYazdir` gizli bir `iframe`
// açıp belge gövdesini yazıyor ve yazıcı penceresini çağırıyor (window.open DEĞİL — telefonda
// açılır pencere engeline takılıyordu). PDF kütüphanesini beklemiyor, internetsiz de çalışıyor.
//
// Ölçülenler (gerçek yazdırma çağrılmadan — çerçevenin `print`i izleniyor):
//   1. Açılan sipariş kartının paylaş şeridinde "Yazdır" var, PDF'in SOLUNDA, hiç kilitlenmiyor
//      (`disabled` yok — PDF hazırlanırken de basılabilmeli).
//   2. Basınca yazıcı penceresi TAM 1 KEZ çağrılıyor; ana pencerenin `print`i çağrılmıyor
//      (sayfanın tamamı değil, yalnız belge basılıyor).
//   3. Basılan gövde siparişin kendisi: "SAT-9001", müşteri ve kalem var; uygulamanın menüsü
//      (MODÜLLER, üst menü düğmeleri) YOK.
//   4. Ağ tamamen kapalı (esm.sh dahil her dış istek reddediliyor) — yazdırma yine çalışıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const sp = JSON.parse(TOHUM["siparis:data"]);
  sp.push({
    id: "sy1", siparisNo: "SAT-9001", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-10", teslimTarihi: "2026-09-30", not: "", musteriKodu: "",
    kalemler: [
      { id: "ky1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" },
      { id: "ky2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" },
    ],
  });
  t["siparis:data"] = JSON.stringify(sp);

  const { tarayici, sayfa } = await uygulamaAc(t, {
    hataYaz: false,
    // İnternet yok: file:// dışındaki her istek reddediliyor. Yazdırma buna rağmen çalışmalı.
    onceRota: async (s) => s.route(/^https?:\/\//, (r) => r.abort()),
  });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // YAZDIRMA İZİ: eklenen her iframe'in `print`i kayda çevriliyor (gerçek diyalog açılmasın).
  // MutationObserver, belgeyiYazdir'in eşzamanlı kısmı (ekle + yaz) bittikten sonra, 100 ms'lik
  // gecikmeli `print`ten ÖNCE çalışıyor. Ana pencerenin `print`i de sayılıyor — çağrılmamalı.
  await sayfa.evaluate(() => {
    window.__yazdir = { cerceve: [], anaPencere: 0 };
    window.print = () => { window.__yazdir.anaPencere++; };
    new MutationObserver((kayitlar) => kayitlar.forEach((k) => k.addedNodes.forEach((n) => {
      if (n.tagName !== "IFRAME" || !n.contentWindow) return;
      const w = n.contentWindow;
      w.print = () => {
        const b = w.document.body;
        window.__yazdir.cerceve.push({ baslik: w.document.title, metin: b ? b.innerText : "" });
      };
    }))).observe(document.body, { childList: true });
  });

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  // Kartı aç: sipariş no'yu taşıyan en içteki görünür öğenin tıklanabilir atası.
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")].filter((x) => x.textContent.includes("SAT-9001") && x.getBoundingClientRect().width > 0).pop();
    if (d) d.click();
  });
  await sayfa.waitForTimeout(800);

  const serit = await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-paylas-seridi]")].find((x) => x.getAttribute("data-paylas-seridi").startsWith("SAT-9001") && x.getBoundingClientRect().width > 0);
    if (!s) return null;
    const y = s.querySelector("[data-paylas-yazdir]");
    const p = s.querySelector("[data-paylas-pdf]");
    return {
      dosyaAdi: s.getAttribute("data-paylas-seridi"),
      dugmeler: [...s.querySelectorAll("button")].map((b) => b.textContent.trim()),
      yazdirPdfinSolunda: !!(y && p) && y.getBoundingClientRect().right <= p.getBoundingClientRect().left,
      yazdirKilitlenebilir: !!y && y.hasAttribute("disabled"),
    };
  });

  await sayfa.locator('[data-paylas-seridi^="SAT-9001"] [data-paylas-yazdir]:visible').first().click();
  await sayfa.waitForTimeout(1500);
  const iz = await sayfa.evaluate(() => window.__yazdir);
  const basilan = iz.cerceve[0] || { baslik: null, metin: "" };
  const yazdirma = {
    cerceveCagrisi: iz.cerceve.length,
    anaPencereCagrisi: iz.anaPencere,
    baslik: basilan.baslik,
    siparisNoVar: basilan.metin.includes("SAT-9001"),
    musteriVar: basilan.metin.includes("Müşteri B"),
    kalemVar: /Bot/.test(basilan.metin),
    baskaSiparisYok: !basilan.metin.includes("AS-1"),
    menuYok: !/MODÜLLER|Yeni Sipariş|Tümü\s*\(|Yazdır|WhatsApp/.test(basilan.metin),
    // Basılan belgenin tam metni — altlıktaki bugünün tarihi sabitleniyor.
    metin: basilan.metin.replace(/\d{2}\.\d{2}\.\d{4}/g, "<bugün>").split("\n").map((x) => x.trim()).filter(Boolean),
  };

  await tarayici.close();
  return { hatalar, serit, yazdirma };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
