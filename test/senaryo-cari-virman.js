// SENARYO — CARİ VİRMANI VE FORMDAN KASA / BANKA AÇMA (v1.744.35, kullanıcı 23 Kasım).
//   "Buradan [Kasa & Banka] virman ve kasa banka tanımı yapılabiliyor; virmanı cari içerisinden yapalım, buradan kaldıralım;
//    kasa banka açma işlerimizi [Ödeme & Tahsilat'ta] kasanın yanına ekleme tuşu ekleyerek yapabiliriz." · "ödemeden tıklayınca
//    virman olacak; karşı cari seçilip ilk seçilen cariye ödeme yapmış gibi, tahsilat yapınca ilk seçilen cariye tahsilat
//    yapmış gibi."
// Sahte sunucu fiş defteri kurulu (fis_kes numara verir; eski yoldan car_yaz / kas_yaz / fis_yaz gitmemeli).
// Ölçülen:
//   (1) Ödeme & Tahsilat › Nakit: kasa yokken uyarı + "+" düğmesi; + ile "Ana Kasa" açılır, hemen seçili; Havale/EFT'de + ile
//       banka hesabı (banka adı, IBAN) açılır
//   (2) Kasa & Banka ekranında Virman ve "Yeni Kasa" düğmesi yok
//   (3) Ödeme + Virman: Müşteri B (ilk) → karşı Tedarikçi A, 1.000 ₺ → tek fiş CVR; Müşteri B'de Ödeme/Borç, Tedarikçi A'da
//       Tahsilat/Alacak, ikisi aynı fiş no; kasa / banka hareketi yok; fis_kes isteğinde iki cari satırı
//   (4) Tahsilat + Virman: Tedarikçi A (ilk) → karşı Müşteri B, 250 ₺ → Tedarikçi A'da Tahsilat/Alacak, Müşteri B'de Ödeme/Borç
//   (5) Virmanda cari arama yalnız cari listeler (gelir / gider kartı yok)
const { uygulamaAc, depoOku, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const tan = JSON.parse(TOHUM["tanimlar:data"]); tan.giderKartlari = [{ id: "g1", ad: "Kira gideri", grup: "genel", tur: "gider" }];
  const istekler = [];
  let sira = 0;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      sira += 1;
      istekler.push({ ad: "fis_kes", tur: p.fis.tur, onek: p.fis.onek, cariSatirlari: ((p.cari && p.cari.satirlar) || []).length,
        kasaSatirlari: ((p.kasa && p.kasa.hareketler) || []).length });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261123${String(sira).padStart(3, "0")}`, bagliFisNo: null, zatenVar: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => {
        const g = r.request().postData() || "";
        // Kasa / banka TANIMI (hesap kaydı) satır taşımaz; yalnız hareket satırı taşıyan eski yol yazması sayılır.
        if (/"(satirlar|hareketler)":\[(\{|")/.test(g)) istekler.push({ ad });
        return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM, "tanimlar:data": JSON.stringify(tan) }, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonuc = {};
  const gorunur = (sec) => sayfa.evaluate((s) => [...document.querySelectorAll(s)].some((x) => x.getBoundingClientRect().height > 0), sec);

  // (2) Kasa & Banka ekranı: Virman ve Yeni Kasa düğmesi yok
  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);

  // (1) Kasa yokken: uyarı ve + düğmesi; + ile kasa aç
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await sayfa.waitForTimeout(200);
  sonuc.kasaYokken = {
    uyari: await sayfa.evaluate(() => /Kasa tanımlı değil — yandaki \+ ile açın/.test(document.body.innerText)),
    arti: await gorunur('[data-odeme-hesap-ekle="kasa"]'),
  };
  await sayfa.locator('[data-odeme-hesap-ekle="kasa"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-odeme-hesap-ekle-formu="kasa"] [data-hesap-ekle-alan="ad"]').fill("Ana Kasa");
  await sayfa.locator('[data-odeme-hesap-ekle-formu="kasa"] [data-hesap-ekle-kaydet]').click(); await sayfa.waitForTimeout(700);
  await sayfa.locator('[data-odeme-sekli="Havale/EFT"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-odeme-hesap-ekle="banka"]:visible').first().click(); await sayfa.waitForTimeout(200);
  const bf = '[data-odeme-hesap-ekle-formu="banka"]';
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="ad"]`).fill("Ziraat Vadesiz");
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="banka"]`).fill("Ziraat Bankası");
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="iban"]`).fill("TR000000000000000000000001");
  await sayfa.locator(`${bf} [data-hesap-ekle-pb]`).selectOption("USD");
  await sayfa.locator(`${bf} [data-hesap-ekle-kaydet]`).click(); await sayfa.waitForTimeout(700);
  const mh = await depoOku(sayfa, "muhasebe:data");
  sonuc.acilanHesaplar = {
    kasalar: (mh.kasalar || []).map((k) => `${k.ad}:${k.paraBirimi}:${(k.hareketler || []).length}`),
    bankalar: (mh.bankalar || []).map((b) => `${b.ad}:${b.banka}:${b.iban}:${b.paraBirimi}`),
    seciliBanka: await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-odeme-hesap]")].find((x) => x.style.background && x.style.background !== "rgb(255, 255, 255)" && x.style.background !== "#fff"); return b ? b.getAttribute("data-odeme-hesap") : null; }),
  };
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await sayfa.waitForTimeout(200);
  sonuc.kasaSatiri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-odeme-hesap]")].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.getAttribute("data-odeme-hesap")));

  await sayfa.locator('[data-odeme-alani-sekme="muhasebe"]:visible').first().click(); await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && (x.textContent || "").trim() === "Ana Kasa" && x.getBoundingClientRect().height > 0); let p = e; for (let i = 0; i < 6 && p; i++, p = p.parentElement) if (p.onclick) { p.click(); return; } if (e) e.click(); });
  await sayfa.waitForTimeout(500);
  sonuc.kasaBankaEkrani = {
    virmanDugmesi: await gorunur('[data-islem="virman"]'),
    yeniKasaDugmesi: await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^\s*Yeni (Kasa|Banka)/.test(b.textContent) && b.getBoundingClientRect().height > 0)),
    hesapAcik: await sayfa.evaluate(() => /Tahsilat, ödeme ve gelir\/gider kaydı/.test(document.body.innerText)),
  };

  // (3) Ödeme + Virman
  await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-odeme-tip="Ödeme"]:visible').first().click(); await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-odeme-sekli="Virman"]:visible').first().click(); await sayfa.waitForTimeout(200);
  sonuc.virmanEkrani = {
    kasaSatiriYok: !(await gorunur("[data-odeme-hesaplar]")),
    // (5) yalnız cariler: "Kira" yazınca gelir/gider kartı çıkmaz
    kartCikmaz: await (async () => {
      const k = sayfa.locator("input[data-odeme-cari]:visible").first(); await k.click(); await k.fill("Kira"); await sayfa.waitForTimeout(200);
      const var_ = await sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-secenek]")].some((x) => /Kira/.test(x.getAttribute("data-cari-secenek"))));
      await k.fill(""); return !var_;
    })(),
  };
  await cariSec(sayfa, "Müşteri B", "", "data-odeme-cari");
  sonuc.virmanEkrani.formAcik = await gorunur('[data-cari-virman="Ödeme"]');
  await cariSec(sayfa, "Tedarikçi A", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("1000");
  await sayfa.locator("[data-cari-virman-aciklama]:visible").fill("mahsup");
  sonuc.virmanEkrani.ozet = await sayfa.evaluate(() => { const o = document.querySelector("[data-cari-virman-ozet]"); return o ? o.innerText.trim() : null; });
  await sayfa.locator("[data-cari-virman-kaydet]:visible").click(); await sayfa.waitForTimeout(1500);
  const cariOku = async () => {
    const cr = await depoOku(sayfa, "cari:data");
    const s = (ad) => ((cr.find((c) => c.unvan === ad) || {}).hareketler || []).map((h) => `${h.fisNo}:${h.islemTipi}:${h.yon}:${h.tutar}:${h.paraBirimi}:${h.odemeSekli}:${h.aciklama}`).sort();
    return { "Müşteri B": s("Müşteri B"), "Tedarikçi A": s("Tedarikçi A") };
  };
  sonuc.odemeVirmani = await cariOku();
  sonuc.odemeVirmani.formTemizlendi = await sayfa.evaluate(() => { const t = document.querySelector("[data-cari-virman-tutar]"); return t ? t.value === "" : null; });

  // (4) Tahsilat + Virman (ilk cari Tedarikçi A)
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').first().click(); await sayfa.waitForTimeout(150);
  await cariSec(sayfa, "Tedarikçi A", "", "data-odeme-cari");
  await cariSec(sayfa, "Müşteri B", '[data-cari-virman="Tahsilat"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("250");
  await sayfa.locator("[data-cari-virman-kaydet]:visible").click(); await sayfa.waitForTimeout(1500);
  sonuc.tahsilatVirmani = await cariOku();
  const mh2 = await depoOku(sayfa, "muhasebe:data");
  sonuc.kasaBankaHareketi = [...(mh2.kasalar || []), ...(mh2.bankalar || [])].reduce((t, h) => t + (h.hareketler || []).length, 0);
  sonuc.sonListe = await sayfa.evaluate(() => [...document.querySelectorAll("tr")].filter((tr) => /CVR-/.test(tr.innerText) && tr.getBoundingClientRect().height > 0).length);
  sonuc.istekler = istekler.map((x) => (x.tur ? `${x.ad}:${x.tur}:${x.onek}:cari${x.cariSatirlari}:kasa${x.kasaSatirlari}` : x.ad));
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}
module.exports = { calistir };
