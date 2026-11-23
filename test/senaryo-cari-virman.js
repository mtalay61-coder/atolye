// SENARYO — CARİ VİRMANI, HESAPLAR ARASI AKTARIM, FORMDAN KASA / BANKA AÇMA (v1.744.35–36, kullanıcı 23 Kasım).
//   "virmanı cari içerisinden yapalım … karşı cari seçilip ilk seçilen cariye ödeme yapmış gibi, tahsilat yapınca ilk seçilen
//    cariye tahsilat yapmış gibi" · "kasa banka açma işlerimizi kasanın yanına ekleme tuşu ekleyerek yapabiliriz" ·
//   "Cari virmanını koru. Kasa–banka ve hesaplar arası para aktarımını da arayüzde erişilebilir bırak; cari virmanından ayrı,
//    açık isimli bir işlem olsun. Yeni testte iki carinin bakiyelerini, kasa/bankanın değişmediğini ve iptalin iki satırı
//    birlikte geri aldığını doğrula. Aynı cari, geçersiz tutar ve farklı para birimlerini de sına; kur dönüşümü yoksa farklı
//    para birimlerini reddet."
// Sahte sunucu fiş defteri kurulu (fis_kes numara verir, fis_iptal iptal eder; eski yoldan satır taşıyan car_yaz / kas_yaz /
// fis_yaz gitmemeli). Tohum: Ana Kasa (TRY, 1.000 açılış), Ziraat (TRY, 500 açılış); Döviz Tedarikçi USD carisi.
// Bakiye: uygulamanın kendi `cariBakiyeleri` / `hesapBakiyesi` (erp.cjs) ile, yerel depodaki kayıttan.
// Ölçülen:
//   (1) + ile kasa ve banka hesabı açılır, hemen seçili
//   (2) Kasa & Banka: "Hesaplar arası aktarım" düğmesi VAR (cari virmanından ayrı ad), "Yeni Kasa / Banka" düğmesi yok
//   (3) Cari virmanı ekranı: kasa satırı yok, gelir / gider kartı listelenmez, ilk cari karşı cari listesinde yok (aynı cari)
//   (4) RET: boş / 0 / −5 tutar; farklı para birimi (TRY → USD carisi, uyarı + ret) — hiçbirinde fis_kes yok, satır yok
//   (5) Ödeme virmanı 1.000: Müşteri B +1.000 (borç), Tedarikçi A −1.000 (alacak), tek CVR fişi, iki cari satırı, kasa satırı yok
//   (6) Tahsilat virmanı 250 (ilk cari Tedarikçi A): Tedarikçi A tahsilat (alacak), karşı Müşteri B ödeme (borç)
//   (7) Geri al (son fiş): TEK fis_iptal, o fişin iki satırı birlikte kalkar, bakiyeler (5)'teki hâle döner
//   Her adımda kasa / banka hareket sayısı ve bakiyesi değişmez.
const { uygulamaAc, depoOku, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const { cariBakiyeleri, hesapBakiyesi } = require("./erp.cjs");

async function calistir() {
  const tan = JSON.parse(TOHUM["tanimlar:data"]); tan.giderKartlari = [{ id: "g1", ad: "Kira gideri", grup: "genel", tur: "gider" }];
  const cariler = JSON.parse(TOHUM["cari:data"]);
  cariler.push({ ...cariler.find((c) => c.id === "c1"), id: "c9", unvan: "Döviz Tedarikçi", paraBirimi: "USD", hareketler: [] });
  const m = JSON.parse(TOHUM["muhasebe:data"]);
  m.kasalar = [{ id: "k1", ad: "Ana Kasa", paraBirimi: "TRY", hareketler: [{ id: "ka1", tarih: "2026-11-01", yon: "Giriş", tutar: 1000, aciklama: "açılış", defter: "Genel" }] }];
  m.bankalar = [{ id: "b1", ad: "Ziraat", banka: "Ziraat Bankası", paraBirimi: "TRY", hareketler: [{ id: "ba1", tarih: "2026-11-01", yon: "Giriş", tutar: 500, aciklama: "açılış", defter: "Genel" }] }];
  const istekler = [];
  let sira = 0;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      sira += 1;
      istekler.push(`fis_kes:${p.fis.tur}:${p.fis.onek}:cari${((p.cari && p.cari.satirlar) || []).length}:kasa${((p.kasa && p.kasa.hareketler) || []).length}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261123${String(sira).padStart(3, "0")}`, bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push(`fis_iptal:${p.no}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: p.no, zatenIptal: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => {
        const g = r.request().postData() || "";
        // Kasa / banka TANIMI ve cari kartı satır taşımaz; yalnız hareket satırı / iptali taşıyan eski yol yazması sayılır.
        if (/"(satirlar|hareketler|hareketIptal)":\[(\{|")/.test(g)) istekler.push(`ESKI_YOL:${ad}`);
        return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });
    }
    // Kasa & Banka bulut hâli tohumdan (taban kurulsun; kural-provasi deseni).
    await sayfa.route("**/rest/v1/muhasebe?**", (r) => (r.request().method() === "GET"
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "tekil", veri: m }]) }) : r.fallback()));
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM, "tanimlar:data": JSON.stringify(tan), "cari:data": JSON.stringify(cariler), "muhasebe:data": JSON.stringify(m) },
    { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonuc = {};
  const gorunur = (sec) => sayfa.evaluate((s) => [...document.querySelectorAll(s)].some((x) => x.getBoundingClientRect().height > 0), sec);
  const toast = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").replace(/Geri al$/, "").trim()).join(" | "));
  // Durum: iki carinin bakiyesi ve satırları + bütün kasa / banka hesaplarının hareket sayısı ve bakiyesi
  const durum = async () => {
    const cr = await depoOku(sayfa, "cari:data"); const mh = await depoOku(sayfa, "muhasebe:data");
    const cari = (ad) => { const c = cr.find((x) => x.unvan === ad) || {}; return {
      bakiye: cariBakiyeleri(c), satirlar: (c.hareketler || []).map((h) => `${h.fisNo}:${h.islemTipi}:${h.yon}:${h.tutar}:${h.paraBirimi}:${h.odemeSekli}`).sort() }; };
    return {
      "Müşteri B": cari("Müşteri B"), "Tedarikçi A": cari("Tedarikçi A"), "Döviz Tedarikçi": cari("Döviz Tedarikçi"),
      kasaBanka: [...(mh.kasalar || []), ...(mh.bankalar || [])].map((h) => `${h.ad}:${(h.hareketler || []).length} hareket:${hesapBakiyesi(h)} ${h.paraBirimi}`),
    };
  };
  const kaydet = async () => { await sayfa.locator("[data-cari-virman-kaydet]:visible").click(); await sayfa.waitForTimeout(1300); };

  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);

  // (1) + ile kasa ve banka aç
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-odeme-hesap-ekle="kasa"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-odeme-hesap-ekle-formu="kasa"] [data-hesap-ekle-alan="ad"]').fill("Şube Kasa");
  await sayfa.locator('[data-odeme-hesap-ekle-formu="kasa"] [data-hesap-ekle-kaydet]').click(); await sayfa.waitForTimeout(700);
  const seciliHesap = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-odeme-hesap]")].find((x) => x.getBoundingClientRect().height > 0 && /47, 107, 79/.test(x.style.background)); return b ? b.getAttribute("data-odeme-hesap") : null; });
  const kasaSecili = await seciliHesap();
  await sayfa.locator('[data-odeme-sekli="Havale/EFT"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-odeme-hesap-ekle="banka"]:visible').first().click(); await sayfa.waitForTimeout(200);
  const bf = '[data-odeme-hesap-ekle-formu="banka"]';
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="ad"]`).fill("Vakıf Döviz");
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="banka"]`).fill("Vakıfbank");
  await sayfa.locator(`${bf} [data-hesap-ekle-alan="iban"]`).fill("TR000000000000000000000001");
  await sayfa.locator(`${bf} [data-hesap-ekle-pb]`).selectOption("USD");
  await sayfa.locator(`${bf} [data-hesap-ekle-kaydet]`).click(); await sayfa.waitForTimeout(700);
  const mh1 = await depoOku(sayfa, "muhasebe:data");
  sonuc.hesapAcma = {
    kasalar: (mh1.kasalar || []).map((k) => `${k.ad}:${k.paraBirimi}`), bankalar: (mh1.bankalar || []).map((b) => `${b.ad}:${b.banka || ""}:${b.iban || ""}:${b.paraBirimi}`),
    kasaSecili, bankaSecili: await seciliHesap(),
  };

  // (2) Kasa & Banka ekranı
  await sayfa.locator('[data-odeme-alani-sekme="muhasebe"]:visible').first().click(); await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && (x.textContent || "").trim() === "Ana Kasa" && x.getBoundingClientRect().height > 0); let p = e; for (let i = 0; i < 6 && p; i++, p = p.parentElement) if (p.onclick) { p.click(); return; } if (e) e.click(); });
  await sayfa.waitForTimeout(500);
  sonuc.kasaBankaEkrani = {
    islemDugmeleri: await sayfa.evaluate(() => [...document.querySelectorAll("[data-islem]")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => `${b.getAttribute("data-islem")}:${b.textContent.trim()}`)),
    yeniKasaDugmesi: await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^\s*Yeni (Kasa|Banka)/.test(b.textContent) && b.getBoundingClientRect().height > 0)),
  };
  await sayfa.locator('[data-islem="virman"]:visible').first().click(); await sayfa.waitForTimeout(300);
  sonuc.kasaBankaEkrani.aktarimFormu = await gorunur("[data-virman-formu]");
  sonuc.kasaBankaEkrani.hedefler = await sayfa.evaluate(() => { const s = document.querySelector("[data-virman-hedef]"); return s ? [...s.options].map((o) => o.textContent).filter((x) => x !== "Seçin…") : []; });

  // (3) Cari virmanı ekranı
  await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-odeme-tip="Ödeme"]:visible').first().click(); await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-odeme-sekli="Virman"]:visible').first().click(); await sayfa.waitForTimeout(200);
  const secenekVar = async (girdi, ara, sec) => {
    const k = sayfa.locator(`input[${girdi}]:visible`).first(); await k.click(); await k.fill(ara); await sayfa.waitForTimeout(250);
    const v = await sayfa.evaluate((s) => [...document.querySelectorAll("[data-cari-secenek]")].filter((x) => x.getBoundingClientRect().height > 0).some((x) => new RegExp(s).test(x.getAttribute("data-cari-secenek"))), sec);
    await k.fill(""); await sayfa.locator("h1, h2, h3").first().click({ force: true }).catch(() => {}); await sayfa.waitForTimeout(200); return v;
  };
  sonuc.virmanEkrani = {
    sekliAdi: await sayfa.evaluate(() => (document.querySelector('[data-odeme-sekli="Virman"]') || {}).textContent),
    kasaSatiriYok: !(await gorunur("[data-odeme-hesaplar]")),
    gelirGiderKartiYok: !(await secenekVar("data-odeme-cari", "Kira", "Kira")),
  };
  await cariSec(sayfa, "Müşteri B", "", "data-odeme-cari");
  sonuc.virmanEkrani.formAcik = await gorunur('[data-cari-virman="Ödeme"]');
  sonuc.virmanEkrani.paraBirimi = await sayfa.evaluate(() => { const e = document.querySelector("[data-cari-virman-pb]"); return e ? e.getAttribute("data-cari-virman-pb") : null; });
  sonuc.virmanEkrani.ayniCariListedeYok = !(await secenekVar("data-cari-virman-karsi", "Müşteri B", "^Müşteri B$"));
  const once = await durum();
  sonuc.baslangic = once;

  // (4) RET: geçersiz tutarlar (karşı cari geçerli: Tedarikçi A)
  await cariSec(sayfa, "Tedarikçi A", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  sonuc.ret = {};
  for (const [ad, deger] of [["bos", ""], ["sifir", "0"], ["eksi", "-5"]]) {
    await sayfa.locator("[data-cari-virman-tutar]:visible").fill(deger);
    await kaydet();
    sonuc.ret[ad] = await toast();
  }
  // Farklı para birimi: karşı cari USD → uyarı + ret
  await cariSec(sayfa, "Döviz Tedarikçi", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("100");
  sonuc.ret.farkliParaBirimiUyari = await sayfa.evaluate(() => { const e = document.querySelector("[data-cari-virman-pb-uyari]"); return e ? e.innerText.trim() : null; });
  await kaydet();
  sonuc.ret.farkliParaBirimi = await toast();
  sonuc.ret.istekYok = istekler.length === 0;
  sonuc.ret.durumDegismedi = JSON.stringify(await durum()) === JSON.stringify(once);

  // (5) Ödeme virmanı 1.000: Müşteri B → karşı Tedarikçi A
  await cariSec(sayfa, "Tedarikçi A", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("1000");
  await sayfa.locator("[data-cari-virman-aciklama]:visible").fill("mahsup");
  sonuc.odemeOzeti = await sayfa.evaluate(() => { const o = document.querySelector("[data-cari-virman-ozet]"); return o ? o.innerText.trim() : null; });
  await kaydet();
  sonuc.odemeVirmani = { toast: await toast(), ...(await durum()) };
  sonuc.odemeVirmani.formTemizlendi = await sayfa.evaluate(() => { const t = document.querySelector("[data-cari-virman-tutar]"); return t ? t.value === "" : null; });

  // (6) Tahsilat virmanı 250: ilk cari Tedarikçi A → karşı Müşteri B
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').first().click(); await sayfa.waitForTimeout(150);
  await cariSec(sayfa, "Tedarikçi A", "", "data-odeme-cari");
  await cariSec(sayfa, "Müşteri B", '[data-cari-virman="Tahsilat"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("250");
  await kaydet();
  sonuc.tahsilatVirmani = { toast: await toast(), ...(await durum()) };

  // (7) Geri al: son fiş (CVR-…002) — iki satırı birlikte kalkmalı, bakiyeler (5)'e dönmeli
  const istekOnce = istekler.length;
  await sayfa.locator("[data-toast-geri-al]:visible").first().click();
  await sayfa.waitForTimeout(500);
  const onay = sayfa.locator("[data-sil-onayla]:visible");
  if (await onay.count()) await onay.first().click();
  await sayfa.waitForTimeout(1800);
  const geriAlSonrasi = await durum();
  sonuc.geriAl = {
    toast: await toast(), istekler: istekler.slice(istekOnce), ...geriAlSonrasi,
    odemeVirmaniHalineDondu: JSON.stringify(["Müşteri B", "Tedarikçi A", "kasaBanka"].map((k) => geriAlSonrasi[k])) === JSON.stringify(["Müşteri B", "Tedarikçi A", "kasaBanka"].map((k) => sonuc.odemeVirmani[k])),
  };
  sonuc.kasaBankaHicDegismedi = [sonuc.odemeVirmani, sonuc.tahsilatVirmani, geriAlSonrasi].every((d) => JSON.stringify(d.kasaBanka) === JSON.stringify(once.kasaBanka));
  sonuc.defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.tip}|${(f.cariHareketleri || []).length} cari|${(f.kasaHareketleri || []).length} kasa|${f.iptal ? "iptal" : "gecerli"}`));
  sonuc.istekler = istekler;
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}
module.exports = { calistir };
