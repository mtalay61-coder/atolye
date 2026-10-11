// SENARYO — FİNANS › ÖDEME & TAHSİLAT (v1.645.8).
//
// Kullanıcı: "Ödeme & Tahsilat sekme olsun; kasa, banka, çek, senet hepsi içerisinde olsun, ödemelerin ve tahsilatların
// girileceği yer." Ekran Cari ile AYNI modül örneği (kapsam "odeme"); form cari kartındaki formun kendisi.
//
// Ölçülen:
//   1. Menüde öğe var; ekran açılır, cari seçilmeden boş durum yazısı.
//   2. Tahsilat + Nakit + cari seçince KISA FORM (Kasa & Banka işlemi gibi, v1.645.10), kasa kendiliğinden seçili.
//   3. Kaydedince kasa hareketi ve cari hareketi (THS-) yazılır; altta "Son tahsilat ve ödemeler" satırı çıkar.
//   4. Ödeme + Çek seçilince form çek bilgileriyle açılır (ödeme şekli Çek).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

(async () => {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const sonuc = {};
  sonuc.menuVar = await sayfa.evaluate(() => !!document.querySelector('[data-nav="odemetahsilat"]') || [...document.querySelectorAll("[data-nav]")].some((b) => /Ödeme & Tahsilat/.test(b.textContent)));
  await modulAc(sayfa, "Ödeme & Tahsilat");
  await sayfa.waitForTimeout(700);
  const gorunen = () => sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-odeme-tahsilat]")].find((x) => x.getBoundingClientRect().width > 0); return e ? e.innerText.replace(/\s+/g, " ") : null; });
  const ilk = await gorunen();
  sonuc.ekran = !!ilk;
  sonuc.bosDurum = /cariyi seçin/.test(ilk || "");

  // Tahsilat + Nakit + Müşteri B.
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300); await kutu.press("Enter");
  await sayfa.waitForTimeout(1000);
  // v1.645.10: nakitte cari kartı değil Kasa & Banka işlemi gibi KISA FORM; kasa kendiliğinden seçili.
  sonuc.kisaForm = await sayfa.evaluate(() => {
    const f = [...document.querySelectorAll("[data-odeme-kisa-form]")].find((x) => x.getBoundingClientRect().width > 0);
    const h = f && f.querySelector("[data-siparis-odeme-hesap]");
    return f ? { hesap: h ? h.options[h.selectedIndex].text : null, cariKartiYok: !f.closest("[data-odeme-tahsilat]").querySelector("[data-cari-kart-id]") } : null;
  });
  await sayfa.locator("[data-odeme-kisa-form] [data-siparis-odeme-tutar]:visible").fill("500");
  await sayfa.locator("[data-odeme-kisa-form] [data-siparis-odeme-kaydet]:visible").click();
  await sayfa.waitForTimeout(1500);
  sonuc.kayittanSonraBos = await sayfa.evaluate(() => (document.querySelector("[data-odeme-kisa-form] [data-siparis-odeme-tutar]") || {}).value);
  const m = await depoOku(sayfa, "muhasebe:data");
  sonuc.kasa = ((((m || {}).kasalar || [])[0] || {}).hareketler || []).map((h) => [h.yon, h.tutar]);
  const c = ((await depoOku(sayfa, "cari:data")) || []).find((x) => x.unvan === "Müşteri B") || {};
  sonuc.cariTahsilat = (c.hareketler || []).filter((h) => /^THS-/.test(h.fisNo || "")).map((h) => [h.tutar, h.odemeSekli]);
  sonuc.sonListe = await sayfa.evaluate(() => [...document.querySelectorAll("[data-odeme-son-satir]")].map((r) => [...r.cells].slice(1, 5).map((x) => x.innerText.trim()).join(" | ")));

  // Ödeme + Çek: form çek bilgileriyle açılır.
  await sayfa.locator('[data-odeme-tip="Ödeme"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Çek"]:visible').click();
  await sayfa.waitForTimeout(800);
  sonuc.cekFormu = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-odeme-tahsilat]").innerText;
    const s = [...document.querySelectorAll("[data-odeme-tahsilat] select")].find((x) => [...x.options].some((o) => o.value === "Senet"));
    return { sekil: s ? s.value : null, cekBilgileri: /Çek bilgileri/.test(k) };
  });
  // v1.645.10 — TEK ALAN: üç ekranda da ortak sekme şeridi; özet kartı (kasa bakiyesi) Kasa & Banka'yı açar.
  sonuc.ozetler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-odeme-ozet]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  const seritSekmeleri = () => sayfa.evaluate(() => { const s = [...document.querySelectorAll("[data-odeme-alani-seridi]")].find((x) => x.getBoundingClientRect().width > 0); return s ? [...s.querySelectorAll("[data-odeme-alani-sekme]")].map((b) => `${b.dataset.odemeAlaniSekme}:${getComputedStyle(b).color === "rgb(255, 255, 255)" ? "seçili" : "-"}`) : null; });
  sonuc.seritGiris = await seritSekmeleri();
  await sayfa.locator('[data-odeme-ozet="Kasa-k1"]:visible').click();
  await sayfa.waitForTimeout(600);
  sonuc.seritKasa = await seritSekmeleri();
  await sayfa.locator('[data-odeme-alani-sekme="cekler"]:visible').click();
  await sayfa.waitForTimeout(600);
  sonuc.seritCek = await seritSekmeleri();
  // RAPOR sekmesi (v1.645.10).
  await sayfa.locator('[data-odeme-alani-sekme="odemerapor"]:visible').click();
  await sayfa.waitForTimeout(700);
  sonuc.rapor = await sayfa.evaluate(() => {
    const r = [...document.querySelectorAll("[data-odeme-raporu]")].find((x) => x.getBoundingClientRect().width > 0);
    if (!r) return null;
    const tablo = (sel) => [...r.querySelectorAll(`${sel} tbody tr`)].map((t) => [...t.cells].map((c) => c.innerText.trim()).join(" | "));
    return { ozet: tablo("[data-odeme-rapor-ozet]"), hesaplar: tablo("[data-odeme-rapor-hesaplar]"), liste: tablo("[data-odeme-rapor-liste]").map((x) => x.split(" | ").filter((_, i) => i !== 0 && i !== 5).join(" | ")) };   // tarih ve fiş no güne bağlı
  });
  // v1.645.12 — TEK SAYFA SEKMESİ: kasa, çek ve rapor açıldıktan sonra üst şeritte yalnız Ödeme & Tahsilat.
  sonuc.ustSeritSekmeleri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-serit-sekme]")].map((x) => x.dataset.seritSekme));
  // Menüden dönünce en son bakılan ekran (Rapor) açılır.
  await modulAc(sayfa, "Anasayfa"); await sayfa.waitForTimeout(400);
  await modulAc(sayfa, "Ödeme & Tahsilat"); await sayfa.waitForTimeout(600);
  sonuc.donusteSonEkran = await sayfa.evaluate(() => !!([...document.querySelectorAll("[data-odeme-raporu]")].find((x) => x.getBoundingClientRect().width > 0)));
  sonuc.hatalar = hatalar;
  console.log(JSON.stringify(sonuc, null, 1));
  await tarayici.close();
})();
