// SENARYO — CARİ KARTI AÇILIŞ GÖRÜNÜMÜ.
// Kart günlük işte HAREKETLER için açılıyor; telefon/vergi no/adres/fotoğraf ve personelin barkod
// + proses ayarları kayıt sırasında giriliyor. Bu yüzden düzenleme alanları AÇILIŞTA GİZLİ,
// "Düzenle" ile açılıyor. Bu senaryo iki durumu da doğruluyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const gorunum = (sayfa) => sayfa.evaluate(() => {
  const t = document.body.innerText;
  return {
    telefonAlani: /Telefon/.test(t),
    barkodAlani: /Barkod Kodu/.test(t),
    prosesSecimi: /Bağlı Olduğu Prosesler/.test(t),
    hareketlerSekmesi: /Hareketler/.test(t),
    // Düğme artık ikon (title "Düzenle · F2"); metin yerine işaret sayılıyor.
    duzenleDugmesi: document.querySelectorAll("[data-kart-eylem=\"duzenle\"]").length > 0,
  };
});

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  // Aynı kartta İKİ tür kayıt: para hareketi (tahsilat) ve satış fişi.
  // Fişte beş beden var — defter sekmesi bunu TEK fiş saymalı (bkz. 5j).
  const fisOrtak = { fisNo: "SF-1", tarih: "2026-09-04", zaman: "2026-09-04T09:00:00.000Z",
    yon: "Borç", paraBirimi: "TRY", defter: "Genel", aciklama: "satış",
    urunAd: "SS Model", renk: "Lacivert", odemeSekli: "Nakit" };
  cariler.find((c) => c.unvan === "Personel C").hareketler = [
    { id: "t1", fisNo: "THS-20260904-001", tarih: "2026-09-04", zaman: "2026-09-04T10:00:00.000Z",
      yon: "Alacak", tutar: 500, paraBirimi: "TRY", defter: "Genel",
      aciklama: "Tahsilat", odemeSekli: "Kredi Kartı" },
    // Çekli tahsilat: ayrıntısı AÇIKLAMA sütununda görünmeli, tarih sütununu boğmamalı.
    { id: "t2", fisNo: "THS-20260904-002", tarih: "2026-09-04", zaman: "2026-09-04T11:00:00.000Z",
      yon: "Alacak", tutar: 800, paraBirimi: "TRY", defter: "Genel", aciklama: "Tahsilat",
      odemeSekli: "Çek", vade: "2026-09-14",
      cek: { cekNo: "0012345", banka: "Ziraat Bankası", sube: "", iban: "", kesideci: "Kadir Tekstil", sahiplik: "Cirolu", not: "" } },
    ...["36", "37", "38", "39", "40"].map((b, i) => ({ ...fisOrtak, id: `f${i}`, beden: b, tutar: 222, miktar: 1 })),
  ];
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Personel C"):visible').last().click();
  await sayfa.waitForTimeout(700);
  const acilis = await gorunum(sayfa);

  // TEK DÜZENLE (20 Eylül): gövdedeki ikinci "Düzenle" kaldırıldı; başlıktaki kalem hepsini açıyor.
  await sayfa.locator('[data-kart-eylem="duzenle"]:visible').last().click();
  await sayfa.waitForTimeout(500);
  const duzenleme = await gorunum(sayfa);

  // FİŞ SAYIMI — beden başına değil, FİŞ başına.
  //
  // Bir satış fişi beden başına bir hareket yazıyor. Beş bedenli tek fiş, defter sekmesinde
  // "Tümü (5)" görünüyordu; oysa ekstrede TEK satır var. Kullanıcı: "sadece 1 fiş kesildi ama
  // 5 yazıyor." Sayım artık ekstrenin kullandığı gruplamayla aynı.
  // ÖDEME ŞEKLİ — tahsilatta VAR, fişte YOK.
  //
  // Kullanıcı: "Tahsilatta açıklama bölümüne kredi kartı, nakit vs. göstersin."
  // Fişte gösterilmemesi ise bilinçli: fiş cariye borç yazar, kasadan para çıkarmaz;
  // "Nakit" etiketi ödenmiş izlenimi veriyordu.
  const odemeSekliGorunumu = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    return {
      tahsilattaVar: /Kredi Kartı/.test(metin),
      fisteYok: !/Nakit/.test(metin),
      // Çek ayrıntısı AÇIKLAMA hücresinde olmalı, tarih hücresinde değil.
      cekAyrintisiAciklamada: (() => {
        const satir = [...document.querySelectorAll("tr")].find((tr) => /THS-20260904-002/.test(tr.textContent));
        if (!satir) return null;
        const hucreler = [...satir.querySelectorAll("td")];
        return {
          tarihHucresindeYok: !/Ziraat/.test((hucreler[0] || {}).textContent || ""),
          aciklamaHucresindeVar: /Ziraat/.test((hucreler[1] || {}).textContent || ""),
          kesideciVar: /Kadir Tekstil/.test((hucreler[1] || {}).textContent || ""),
        };
      })(),
    };
  });

  const sekmeSayilari = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    const e = metin.match(/Tümü \((\d+)\) Genel \((\d+)\) Resmi \((\d+)\)/);
    return e ? { tumu: +e[1], genel: +e[2], resmi: +e[3] } : null;
  });

  // KALICI CARİ KODU (kullanıcı, 6 Eylül): ekranda görünmeli. Kart açıkken unvanın solunda,
  // dört haneli. Açılışta tüm carilere sırayla atanıyor.
  const cariKodu = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return { kodRozetiVar: /\b000\d\b/.test(m) };
  });

  // YENİ CARİDE PARA BİRİMİ SORULUYOR (kullanıcı, 9 Eylül: "cari açılışta varsayılan para birimi
  // seçmiyoruz ki, bilgiyi neden alıyor?").
  //
  // Alan formda HİÇ YOKTU: cari sessizce "TRY" kaydediliyor, kullanıcı ancak kartını açıp
  // düzenlerse fark ediyordu. Oysa v1.210.0'da hareket ve fiş formları bu alanı varsayılan olarak
  // kullanmaya başlamıştı — yani SORULMAYAN bir bilgi karar veriyordu.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Cari Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(800);
  // GÖRÜNÜR alanlar seçiliyor: aynı etiketler kapalı formlarda da duruyor ve ilk eşleşen
  // görünmeyen olabiliyor (bu oturumda defalarca çıkan tuzak).
  await sayfa.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const gor = (el) => el.getBoundingClientRect().width > 0;
    const l = [...document.querySelectorAll("label")].filter((x) => /Unvan/.test(x.textContent) && gor(x))[0];
    const i = l.querySelector("input");
    set.call(i, "Dolar Tedarikçi");
    i.dispatchEvent(new Event("input", { bubbles: true }));
    const p = [...document.querySelectorAll("label")].filter((x) => /Para Birimi/.test(x.textContent) && gor(x))[0];
    const s2 = p.querySelector("select");
    s2.value = "USD";
    s2.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button.btn-save")].find((x) => x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1600);
  const yeniCariler = await depoOku(sayfa, "cari:data");
  const yeniCari = (yeniCariler || []).find((x) => x.unvan === "Dolar Tedarikçi") || null;

  await tarayici.close();
  return {
    hatalar, odemeSekliGorunumu, sekmeSayilari, acilis, duzenleme, cariKodu,
    // Yeni cari formunda seçilen para birimi KAYDA gitti mi.
    yeniCariParaBirimi: yeniCari ? yeniCari.paraBirimi : "(cari kaydedilmedi)",
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
