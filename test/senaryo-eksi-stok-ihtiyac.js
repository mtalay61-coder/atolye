// SENARYO — EKSİ STOK: İHTİYAÇ DEĞİL, SAYIM UYARISI.
//
// Kullanıcı (7 Eylül): "Eksi stoklar için tedarik aslında mantıksız, çünkü eksi stok olamaz;
// yoktan var olamaz. Eksi stoğu ihtiyaç için değil, DEĞERLENDİRME için kullanalım."
//
// 6 Eylül'de eksi stok ihtiyaç listesine EKLENMİŞTİ; o günkü şikâyet "görünmüyor" idi. Görünmesi
// doğru, SATIN ALMAYA DÖNÜŞMESİ yanlış: `−112` bir miktar değil, "girişini yapmadan tükettim"
// demek. Gerçek stok bilinmiyor — 0 da olabilir 300 de.
//
// Bu senaryoda HİÇ SİPARİŞ YOK: hammadde listeye yalnız bozuk kaydı yüzünden giriyor ve matris
// hücresi çizilmiyor. Hücre içi ⚠ işareti ancak sipariş talebi olan kalemde görünür; burada
// ölçülen şey liste başındaki TOPLU uyarı.
//
// İki kural birlikte ölçülüyor:
//   SIFIR SAY → hesapta eksi değer 0; eksi değerden satın alma miktarı TÜREMİYOR.
//   İŞARETLE  → satır ve liste başı "stok bilinmiyor, sayım gerekli" diye damgalanıyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// `receteFazla`: mamulün ölçümleri reçetenin FAZLA düştüğünü gösteriyor mu.
async function birDurum(receteFazla) {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  if (receteFazla) {
    // Bot reçetesi Deri Siyah için 2 diyor, ölçülen 1,7 → her üretimde stoktan fazla düşülmüş.
    stok.find((p) => p.kategori === "Mamul").receteGerceklesme = {
      "u1|Siyah|": { olcum: 3, toplam: 5.1, planlanan: 2 },
    };
  }
  // Deri (hammadde) eksiye düşüyor. HİÇ SİPARİŞ YOK: eski davranışta bu satır hiç görünmezdi.
  // 16 Eylül: stok miktarı HAREKETLERDEN türetiliyor, artık varyanta -7 yazmak yetmiyor —
  // eksiyi yapan hareket de olmalı. Var olan üretim çıkışının yanına çıkış ekleniyor.
  stok[0].variants = stok[0].variants.map((v) => ({ ...v, miktar: -7 }));
  stok[0].hareketler = [
    ...(stok[0].hareketler || []),
    { id: "h-eksi-siyah", tarih: "2026-09-01T08:00:00.000Z", renk: "Siyah", beden: "", miktar: -4, kaynak: "Üretim", fisNo: "1002-Kesim", uretimId: "up1" },
    { id: "h-eksi-taba", tarih: "2026-09-01T08:00:00.000Z", renk: "Taba", beden: "", miktar: -7, kaynak: "Üretim", fisNo: "1002-Kesim", uretimId: "up1" },
  ];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await sayfa.getByRole("button", { name: "Planlama", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Hammadde İhtiyaç/.test(x.textContent.trim()));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1200);

  const metin = await sayfa.evaluate(() => document.body.innerText);
  // TEŞHİS SATIRI — kullanıcı (7 Eylül): "İKİSİ DE OLABİLİR."
  // İkisi de olabiliyorsa hangisi olduğu VERİDEN çıkarılmalı; reçete gerçekleşmesi bunu ayırt
  // ediyor. Ölçüm yoksa bir şey UYDURULMUYOR.
  const teshis = (metin.match(/↳[^\n]{0,90}/) || ["(yok)"])[0];

  await tarayici.close();
  return {
    hatalar,
    teshis,
    // Sipariş olmadan da listede — görünürlük korunuyor.
    hammaddeGorunuyor: /Deri/.test(metin),
    // LİSTE BAŞINDA TOPLU UYARI: tek tek hücre gezip işaret aramak gerekmesin.
    topluUyari: /stok kaydı eksiye düşmüş/.test(metin),
    // Gerçek kayıt değeri gösteriliyor: sayımı yapacak kişi o sayıyı arayacak.
    kayitDegeri: /kayıt: -7/.test(metin),
    // SIFIR SAYILDIĞI AÇIKÇA YAZILI.
    sifirKabulYazili: /0 kabul edildi/.test(metin),
    // ASIL KURAL: eksi değerden satın alma miktarı TÜREMİYOR. "−7" bir eksik rozeti olarak
    // görünmemeli — o sayı bir ihtiyaç değil, bozuk bir kayıt.
    eksiDegerdenMiktarTuremiyor: !/−7/.test(metin),
  };
}

async function calistir() {
  // İKİ DURUM: ölçüm reçeteyi suçluyor / ölçüm yok.
  const receteSuclu = await birDurum(true);
  const olcumsuz = await birDurum(false);
  return {
    hatalar: [...receteSuclu.hatalar, ...olcumsuz.hatalar],
    ortak: {
      hammaddeGorunuyor: receteSuclu.hammaddeGorunuyor,
      topluUyari: receteSuclu.topluUyari,
      kayitDegeri: receteSuclu.kayitDegeri,
      sifirKabulYazili: receteSuclu.sifirKabulYazili,
      eksiDegerdenMiktarTuremiyor: receteSuclu.eksiDegerdenMiktarTuremiyor,
    },
    // Ölçüm reçetenin fazla düştüğünü gösteriyorsa şüpheli mamul adıyla söyleniyor.
    receteSucluTeshis: receteSuclu.teshis,
    // Hiç ölçüm yoksa sebep SÖYLENMİYOR — uydurma teşhis yanlış yeri düzelttirir.
    olcumsuzTeshis: olcumsuz.teshis,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
