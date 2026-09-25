// SENARYO — SATIN ALMA SÜTUNU REZERVELİ ALIMLARI DA GÖSTERİYOR.
//
// Kullanıcı (ekran görüntüsüyle): "Satın alma oluşturduğumuz stokları göstermiyor."
// Ürün kartındaki Stok Durumu tablosunda SATIN ALMA sütunu "—" görünüyordu; oysa satır detayında
// "YOLDAKİ ALIŞLAR: ALS-1001 · 6 bekliyor · rezerveli (SAT-1001)" yazıyordu.
//
// Sebep: sütun yalnızca REZERVESİZ yoldaki miktarı sayıyordu. Alış siparişi bir satış siparişine
// rezerveli açıldıysa sütun boş kalıyor, bilgi yalnızca detayda duruyordu.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // KULLANICININ İKİNCİ BİLDİRİMİ: Beyaz·36'ya 7 çift bağımsız giriş yapıldı, talebi (6) stoktan
  // karşılandı ve SATIN ALMA sütunu "—" oldu — oysa o beden için de alış yolda. Sütun talebe göre
  // kırpılıyordu. Bu yüzden burada STOK BIRAKILIYOR (7 metre): talep karşılanmış olmasına rağmen
  // yoldaki alım sütunda görünmeli.

  const sip = JSON.parse(t["siparis:data"]);
  sip[0].kalemler[0].rezervasyonlar = [{ siparisId: "s9", siparisNo: "SAT-9", miktar: 6, tuketilen: 0 }];
  t["siparis:data"] = JSON.stringify(sip);

  // Talep olmadan "yolda" hesaplanmıyor: rezerveli alım bir TALEBE karşılık gelir.
  t["stokrez:data"] = JSON.stringify([{
    id: "sr1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", birim: "metre",
    siparisId: "s9", siparisNo: "SAT-9", uretimNo: "10007", miktar: 6, tuketilen: 0,
    tarih: "2026-09-01T08:00:00.000Z",
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Deri" && e.children.length === 0);
    let p = el;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);

  // AÇIKLAMA SATIRI SÜTUN ADLARIYLA AYNI KELİMEYİ KULLANMALI.
  // Sütun AYRILAN'a çevrilmişken açıklama "rezerve" diyordu; ekranda iki ad aynı sütunu anlatıyordu.
  const aciklamaSatiri = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    return {
      ayrilanKelimesi: /ayrılan = açık taleplere STOKTAN verilen/.test(metin),
      eskiKelimeYok: !/rezerve = açık taleplere/.test(metin),
      // Kullanıcının sorusunun cevabı ekranda yazılı olmalı.
      stokYoksaSifir: /stok yoksa 0 olur/.test(metin),
      talepSutunuIsaret: /rezervasyonun tamamı TALEP sütununda/.test(metin),
    };
  });

  // MATRİS varsayılan oldu (15 Eylül); yedi sütunlu ölçüm LİSTE görünümünde yapılıyor.
  const matrisVarsayilan = await sayfa.evaluate(() => !!document.querySelector("[data-stok-matris]"));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-stok-gorunum="liste"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  const tablo = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    const i = metin.indexOf("RENK / ÖLÇÜ");
    const kesit = i >= 0 ? metin.slice(i, i + 200) : "";
    return {
      // Rezerveli yoldaki miktar sütunda görünmeli, rezerveli kısım parantezde ayrılmalı.
      // Talep stoktan karşılanmış olsa BİLE yoldaki 6 sütunda görünmeli.
      sutundaGorunuyor: /6 \(6 rez\.\)/.test(kesit),
      // Talep karşılandığı için AÇIK yok; sütun bundan etkilenmemeli.
      acikYok: /✓/.test(kesit),
      // Toplam satırı sütunla tutarlı olmalı; eskiden 0 yazıyordu.
      toplamTutarli: /Toplam \(metre\) 11 6 5 6/.test(kesit),
      // BEKLENEN SERBEST = serbest + tahsis edilmemiş alım.
      // Talep (6) STOKTAN karşılandığı için yoldaki rezerveli 6 artık sahipsiz: geldiğinde
      // serbest kalacak. Doğru değer 1 değil 7. ("Beklenen hâlâ 1 görünüyor" bildirimi.)
      beklenenSerbestDogru: /1 6 \(6 rez\.\) 7 6/.test(kesit),
      kesit,
    };
  });

  // Talep satırında üretim no da görünmeli (v1.108.0).
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("td")].find((e) => /Siyah/.test(e.textContent));
    if (el && el.parentElement) el.parentElement.click();
  });
  await sayfa.waitForTimeout(500);
  const detay = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    return {
      uretimNoGorunuyor: /üretim 10007/.test(metin),
      yoldakiAlisVar: /YOLDAKİ ALIŞLAR/.test(metin),
      // TALEP NEREYE GİTTİ denklemi: talep = stoktan ayrılan + yoldan tahsisli + açık.
      // Bu satırda talep 6, stoktan 6 karşılandı, yolda tahsis 0, açık 0.
      talepDenklemi: /talep 6 = stoktan ayrılan 6 \+ yoldan tahsisli 0 \+ açık 0/.test(metin),
    };
  });

  await tarayici.close();
  return { hatalar, aciklamaSatiri, matrisVarsayilan, tablo, detay };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
