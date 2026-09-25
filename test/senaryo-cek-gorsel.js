// SENARYO — ÇEK GÖRSELLERİ.
//
// Kullanıcı (6 Eylül): "Çek resmi olmalı, önü ve arkasının çekildiği." → sonra: "Çek resimleri
// SQL bağlantısı olsun."
//
// İKİ YOL, İKİ BİÇİM (ürün görsellerindeki dersin aynısı, 7u):
//   BULUT  → `cek_gorselleri` tablosu, çek başına BİR SATIR. Sıkışma yok.
//   YEREL  → çek başına ayrı anahtar (`cekgorsel:<id>`). Hepsini tek anahtarda toplamak,
//            uygulamanın kayıt başına 5 MB sınırına çek başına iki fotoğrafla hızla çarpmaktı.
//
// `tabloYaz`ın dördüncü parametresi bunu mümkün kılıyor: buluta tam liste, yerele boş liste.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], bankalar: [], kurlar: {},
    cekler: [{ id: "c1", durum: "Portföyde", tip: "Alınan", cekNo: "12345", cariId: "c2", tutar: 42000, paraBirimi: "TRY", vadeTarihi: "2026-12-01" }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await modulAc(sayfa, "Muhasebe");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Çek" && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(800);

  // ---- ÇEK DEFTERLERİ VE FORM (kullanıcı, 6 Eylül) ---------------------------------------------
  //
  // "Verilen çek için kendi çek defterimiz olması gerekiyor. Verilende kendimiz çek yazmışız
  // demektir, onu da ŞAHSİ ÇEK ÇIKIŞI olarak isimlendir."
  // "Ciro edildi, bankaya tahsilinde vs. seçmeli olmasın — zaten işlem yapıp yön belirliyoruz."
  // "Çek girişinde p.birimi değişse bile tutar üzerinde TL işareti duruyor."
  const cekEkrani = await sayfa.evaluate(() => ({
    defterler: [...document.querySelectorAll("button")]
      .filter((b) => /Alınan Çekler|Şahsi Çek Çıkışı/.test(b.textContent))
      .map((b) => b.textContent.trim()),
    // Durum artık SEÇİLMİYOR, rozet olarak gösteriliyor.
    durumSecicisiVar: [...document.querySelectorAll("select")]
      .some((sel) => [...sel.options].some((o) => /Ciro Edildi/.test(o.textContent))),
  }));

  // Form: para birimi USD yapılınca tutar etiketi ve kur alanı.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Yeni Çek|Şahsi Çek Yaz/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const tutarEtiketiTL = await sayfa.evaluate(() => (document.body.innerText.match(/Tutar \([^)]*\)/) || [""])[0]);
  await sayfa.evaluate(() => {
    const sel = [...document.querySelectorAll("select")]
      .filter((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR")[0];
    sel.value = "USD";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(600);
  const formDoviz = await sayfa.evaluate(() => ({
    tutarEtiketi: (document.body.innerText.match(/Tutar \([^)]*\)/) || [""])[0],
    // "Bunu para olan HER YERDE yap mutlaka" — çek girişinde de kur çevirici.
    kurAlani: /Kur \(1 USD = \? TRY\)/.test(document.body.innerText),
    tlKarsiligi: /TL Karşılığı/.test(document.body.innerText),
  }));
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Yeni Çek|Şahsi Çek Yaz/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);

  // ÖN VE ARKA İÇİN AYRI KUTU. Tek kutu, "hangi yüz" sorusunu cevapsız bırakırdı.
  const kutuSayisi = await sayfa.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /Çekin (ÖN|ARKA) yüzü/.test(b.title || "")).length);

  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Çekin ÖN yüzü/.test(x.title || ""));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('input[type="file"]:not([capture])').last()
    .setInputFiles(require("path").join(__dirname, "test-gorsel.png"));
  await sayfa.waitForTimeout(1600);

  const depo = await sayfa.evaluate(() => ({ ...window.__depo }));
  const yerelAnahtarlar = Object.keys(depo).filter((k) => k.startsWith("cekgorsel:") && k !== "cekgorsel:data");
  const bulutListesi = JSON.parse(depo["cekgorsel:data"] || "[]");

  // ---- ÇEK GİRİŞİ CARİYE İŞLENİYOR -------------------------------------------------------------
  //
  // Kullanıcı (notta açık madde, 6 Eylül): "Şahsi çek çıkışı cari hareketi doğurmuyor. Kendi
  // çekimizi yazmak, karşı tarafa borcumuzu kapatan bir işlem."
  //
  // İki yönde de geçerli:
  //   VERİLEN (şahsi çek çıkışı) → biz ödedik, o cariye borcumuz azalır → yön "Borç"
  //   ALINAN  (müşteri çeki)     → müşteri ödedi, alacağımız azalır     → yön "Alacak"
  const cekYaz = async (sekme) => {
    await sayfa.evaluate((s2) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(s2));
      if (b) b.click();
    }, sekme);
    await sayfa.waitForTimeout(500);
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /Şahsi Çek Yaz|Yeni Çek/.test(x.textContent));
      if (b) b.click();
    });
    await sayfa.waitForTimeout(600);
    // ALANLAR ETİKETİNDEN BULUNUYOR: modülün üstünde TCMB kur kutuları da var ve "ilk sayı
    // kutusu" onlara denk geliyordu.
    await sayfa.evaluate(() => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      const bul = (re) => [...document.querySelectorAll("label")].find((l) => re.test(l.textContent));
      const t = bul(/^Tutar/);
      if (t) { const i = t.querySelector("input"); set.call(i, "5000"); i.dispatchEvent(new Event("input", { bubbles: true })); }
      const v = bul(/Vade Tarihi/);
      if (v) { const i = v.querySelector("input"); set.call(i, "2026-12-01"); i.dispatchEvent(new Event("input", { bubbles: true })); }
      const c = bul(/^Cari/);
      if (c) {
        const sel = c.querySelector("select");
        const o = [...sel.options].find((x) => /Tedarikçi A/.test(x.textContent));
        if (o) { sel.value = o.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    });
    await sayfa.waitForTimeout(500);
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .filter((x) => x.getBoundingClientRect().width > 0)
        .find((x) => x.textContent.trim() === "Kaydet");
      if (b) b.click();
    });
    await sayfa.waitForTimeout(1600);
  };

  await cekYaz("Şahsi Çek Çıkışı");
  const cariler1 = await depoOku(sayfa, "cari:data");
  const ted1 = (cariler1 || []).find((c) => c.unvan === "Tedarikçi A") || {};
  const sahsiCek = (ted1.hareketler || [])[0] || {};

  await cekYaz("Alınan Çekler");
  const cariler2 = await depoOku(sayfa, "cari:data");
  const ted2 = (cariler2 || []).find((c) => c.unvan === "Tedarikçi A") || {};
  const alinanCek = (ted2.hareketler || [])[0] || {};

  const muhasebe = await depoOku(sayfa, "muhasebe:data");
  const yeniCekler = ((muhasebe || {}).cekler || []).filter((c) => c.tutar === 5000);

  await tarayici.close();
  return {
    hatalar,
    // VERİLEN → Borç (borcumuz azaldı), ALINAN → Alacak (alacağımız azaldı).
    sahsiCek: { yon: sahsiCek.yon, tutar: sahsiCek.tutar, fisOnEki: (sahsiCek.fisNo || "").slice(0, 3), aciklama: sahsiCek.aciklama },
    alinanCek: { yon: alinanCek.yon, tutar: alinanCek.tutar, fisOnEki: (alinanCek.fisNo || "").slice(0, 3), aciklama: alinanCek.aciklama },
    // Çeke geri bağ: hangi cari hareketinden doğduğu belli olsun (çift kayıt kapısı da bu bağa bakıyor).
    ceklerBagli: yeniCekler.map((c) => [c.tip, !!c.hareketId]),
    cekEkrani,
    tutarEtiketiTL,
    formDoviz,
    kutuSayisi,
    // YEREL: çek başına ayrı anahtar, içinde fotoğraf.
    yerelAnahtar: yerelAnahtarlar,
    yerelDolu: yerelAnahtarlar.some((k) => (depo[k] || "").includes("data:image")),
    // BULUT yoluna giden liste YEREL ANAHTARDA BOŞ tutuluyor: aynı fotoğrafı ikinci kez, tek
    // bir anahtara yazmak sınıra doğru gitmek olurdu. Bulut tarafı `cek_gorselleri` tablosuna
    // satır satır gidiyor (testte Supabase yok, o yüzden yalnız yerel yansıma ölçülüyor).
    bulutAnahtariBos: bulutListesi.length === 0,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
