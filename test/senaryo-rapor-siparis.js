// SENARYO — SİPARİŞ RAPORLARI SEKMESİ (kullanıcı, 12 Eylül: "her modülün içine sekme olarak rapor,
// kullanıcı kendi kursun, gruplu vs.").
//
// Ölçülen: Raporlar sekmesi var; kurucuda gruplama seçilince tablo gruplu ve toplam satırı doğru;
// rapor adıyla KAYDEDİLİYOR ve yenilemeden sonra kayıtlı rapor listede duruyor, açılınca aynı
// tabloyu veriyor (tanım saklanıyor, veri değil).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // k1 ÜRETİME PLANLI (2001): 41 bedenden 10 çift; Kesim bitti; Saya'da 4 bitti, 6 çalışılıyor;
  // Montaj'dan 4 çıktı ve o 4 müşteriye teslim edildi. Kalem aşama satırlarına bölünmeli
  // (kullanıcı, 12 Eylül) ve aşama miktarları kalemi tam vermeli (4 + 6 = 10).
  t["uretim:siparisler"] = JSON.stringify([...JSON.parse(TOHUM["uretim:siparisler"]), {
    id: "up9", siparisNo: "2001", takipKodu: "2001", model: "Bot", urunId: "u2", renk: "Siyah", adet: 10,
    bedenMiktarlari: [{ beden: "41", miktar: 10 }], beden: "Siyah · 41:10", stogaEklendiMi: false, asama: "Saya", durum: "Devam",
    olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [
      { proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: true, atamalar: [{ id: "x1", personelId: "c3", miktar: 10, bedenMiktarlari: { 41: 10 }, tamamlandiMi: true, verilmeTarihi: "2026-09-02", tamamlanmaTarihi: "2026-09-03" }] },
      { proses: "Saya", sira: 2, verildiMi: true, tamamlandiMi: false, atamalar: [
        { id: "x2", personelId: "c3", miktar: 4, bedenMiktarlari: { 41: 4 }, tamamlandiMi: true, verilmeTarihi: "2026-09-04", tamamlanmaTarihi: "2026-09-05" },
        { id: "x3", personelId: "c3", miktar: 6, bedenMiktarlari: { 41: 6 }, tamamlandiMi: false, verilmeTarihi: "2026-09-04" },
      ] },
      { proses: "Montaj", sira: 3, verildiMi: true, tamamlandiMi: false, atamalar: [{ id: "x4", personelId: "c3", miktar: 4, bedenMiktarlari: { 41: 4 }, tamamlandiMi: true, verilmeTarihi: "2026-09-06", tamamlanmaTarihi: "2026-09-07" }] },
    ],
  }]);
  // RESİM: Bot'a kapak ve Siyah renk resmi (küçük sahte data URL'ler).
  const stokR = JSON.parse(TOHUM["stok:items"]).map((u) => (u.id === "u2"
    ? { ...u, kapakResmi: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", renkResimleri: { Siyah: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACw=" } } : u));
  t["stok:items"] = JSON.stringify(stokR);
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
      { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 4, birimFiyat: 25, paraBirimi: "USD", birim: "çift", planlama: { tip: "Üretim", referansNo: "2001" } },
      { id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 6, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", birim: "çift" },
      { id: "k3", urunId: "u2", urunAd: "Bot", renk: "Taba", beden: "41", miktar: 3, karsilanan: 3, birimFiyat: 27, paraBirimi: "USD", birim: "çift" },
    ] },
  ]);
  // YOLDA BULUNAN HATA: açılışta tanımlar sabit bir alan listesiyle yeniden kuruluyor, listede
  // olmayan alanlar düşüyordu — `raporlar` gibi `kodSayaclari` de (barkod/cari kodu sayaçları,
  // "geri gitmez"). Tohuma sayaç konuyor; açılıştan sonra kayıtta duruyor mu ölçülüyor.
  t["tanimlar:data"] = JSON.stringify({ ...JSON.parse(TOHUM["tanimlar:data"]), kodSayaclari: { renk: 5, cari: 12 } });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  const tik = (sel) => sayfa.evaluate((sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);
  const tablo = () => sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    if (!tb) return null;
    const satir = (tr) => [...tr.children].map((td) => td.textContent.trim());
    return {
      baslik: satir(tb.querySelector("thead tr")),
      govde: [...tb.querySelectorAll("tbody tr")].map(satir),
      toplam: tb.querySelector("tfoot tr") ? satir(tb.querySelector("tfoot tr")) : null,
      ozet: (document.querySelector("[data-rapor-ozet]") || {}).textContent,
    };
  });

  await sayfa.getByRole("button", { name: "Sipariş", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  const raporSekmesiVar = await tik('[data-ust-sekme="raporlar"]');
  await sayfa.waitForTimeout(600);
  // MATRİS VARSAYILAN ve AYARLAR KAPALI (v1.246.0): ekranda yalnız sonuç; kurucu Ayarlar düğmesiyle.
  const varsayilanMatris = await sayfa.evaluate(() => !!document.querySelector("[data-rapor-matris]"));
  const ayarlarKapaliGeldi = await sayfa.evaluate(() => (document.querySelector("[data-rapor-ayar-paneli]") || {}).getAttribute("data-rapor-ayar-paneli") === "kapali");
  await tik("[data-rapor-ayarlar]");
  await sayfa.waitForTimeout(300);
  await tik('[data-rapor-duzen="liste"]');
  await sayfa.waitForTimeout(400);
  // Resim sütunu: Siyah satırlarda renk resmi, Taba'da kapak.
  const resimler = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    const bas = [...tb.querySelector("thead tr").children].map((x) => x.textContent.trim());
    const ri = bas.indexOf("Resim"), rk = bas.indexOf("Renk");
    return [...tb.querySelectorAll("tbody tr")].map((tr) => { const img = tr.children[ri].querySelector("img"); return `${tr.children[rk].textContent.trim()}:${img ? (img.src.includes("P///") ? "renk" : "kapak") : "yok"}`; });
  });
  const duz = await tablo();
  // ARAMA KUTUSU RAPORU SÜZÜYOR (kullanıcı, 12 Eylül: "raporlarda arama çalışmıyor").
  await sayfa.locator('input[placeholder^="Raporda ara"]').fill("taba");
  await sayfa.waitForTimeout(400);
  const aramaSonucu = await tablo();
  await sayfa.locator('input[placeholder^="Raporda ara"]').fill("");
  await sayfa.waitForTimeout(300);
  // SÜTUN ARAMASI (kullanıcı, 12 Eylül: "kolonların üzerine arama"): Aşama sütununa "teslim",
  // Aşama Miktarı sütununa ">3" → yalnız 4'lük teslim satırı.
  await sayfa.locator('[data-kolon-arama="asama"]').fill("teslim");
  await sayfa.locator('[data-kolon-arama="asamaMiktar"]').fill(">3");
  await sayfa.waitForTimeout(400);
  const kolonAramasi = await tablo();
  // SEÇENEK LİSTESİ: Renk kutusunun listesi o sütundaki gerçek değerler; Aşama "teslim" seçiliyken
  // (yukarıda dolu) Beden listesi yalnız teslim satırlarının bedenleri (diğer sütunlarla daralıyor).
  const secenekListeleri = await sayfa.evaluate(() => {
    const oku = (k) => { const i = document.querySelector(`[data-kolon-arama="${k}"]`); const d = i && document.getElementById(i.getAttribute("list")); return d ? [...d.options].map((o) => o.value) : null; };
    return { renk: oku("renk"), asamaMiktar: oku("asamaMiktar"), tarih: oku("tarih") };
  });
  await sayfa.locator('[data-kolon-arama="asama"]').fill("");
  await sayfa.locator('[data-kolon-arama="asamaMiktar"]').fill("");
  await sayfa.waitForTimeout(300);
  // AŞAMA SATIRLARI: k1 → teslim 4 (Montaj'dan çıkan 4 teslim edildiği için "üretildi" 0), Saya'da 6;
  // kalan iki kalem planlanmamış / teslim.
  const asamaSatirlari = duz && duz.govde.map((r) => `${r[duz.baslik.indexOf("Aşama")]}:${r[duz.baslik.indexOf("Aşama Miktarı")]}`);
  // AŞAMA İKONU (kullanıcı, 12 Eylül): Saya'da satırında Saya prosesinin ikonu, teslimde kamyon.
  const asamaIkonlari = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    const bas = [...tb.querySelector("thead tr").children].map((x) => x.textContent.trim());
    const ai = bas.indexOf("Aşama");
    return [...tb.querySelectorAll("tbody tr")].map((tr) => { const i = tr.children[ai].querySelector("[data-ikon]"); return `${tr.children[ai].textContent.trim()}:${i ? i.getAttribute("data-ikon") : "yok"}`; });
  });

  // MATRİS (kullanıcı, 12 Eylül): bedenler sütun; aşaması aynı bedenler tek satır. Tohum: 41 Saya'da 6
  // + teslim 4, 41 planlanmamış 6 (ikinci kalem, 42), 41 Taba teslim 3.
  await tik('[data-rapor-duzen="matris"]');
  await sayfa.waitForTimeout(400);
  const matris = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-matris]");
    if (!tb) return null;
    const satir = (tr) => [...tr.children].map((td) => td.textContent.trim());
    return { baslik: satir(tb.querySelector("thead tr")), govde: [...tb.querySelectorAll("tbody tr")].map(satir), toplam: satir(tb.querySelector("tfoot tr")) };
  });
  // Aşama sütunu KAPATILINCA tek satır, aşama hücrenin içinde (seçenek 1).
  await tik('[data-rapor-sutun="asama"]');
  await sayfa.waitForTimeout(400);
  const matrisTekSatir = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-matris]");
    const bas = [...tb.querySelector("thead tr").children].map((td) => td.textContent.trim());
    return [...tb.querySelectorAll("tbody tr")].map((tr) => {
      const td = [...tr.children];
      return { renk: td[bas.indexOf("Renk")].textContent.trim(), h41: td[bas.indexOf("41")].innerText.replace(/\s+/g, " ").trim(), h42: td[bas.indexOf("42")].innerText.replace(/\s+/g, " ").trim() };
    });
  });
  // EXCEL = TABLO (kullanıcı, 12 Eylül): dışa aktarılan satırlar ekrandaki matrisle aynı.
  await sayfa.evaluate(() => { window.__sonRaporExcel = null; });
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-rapor-sekmesi] button")].find((x) => /Excel/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const excel = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-matris]");
    const ekran = [...tb.querySelectorAll("tr")].filter((tr) => !tr.classList.contains("no-print")).length;
    const e = window.__sonRaporExcel;
    return e && {
      satirSayisiAyni: e.length === ekran,
      baslik: e[0],
      ilkSatir: e[1],
      toplam: e[e.length - 1],
      hucreMetni: e[1][e[0].indexOf("41")],
    };
  });
  await tik('[data-rapor-sutun="asama"]');
  await tik('[data-rapor-duzen="liste"]');
  await sayfa.waitForTimeout(300);

  // KUR: yalnız Ürün · Renk · Aşama Miktarı · Kalan · Tutar sütunları, Ürün+Renk gruplu.
  const kapat = ["resim", "siparisNo", "tarih", "teslimTarihi", "cari", "durum", "musteriKodu", "beden", "birim", "planlamaTipi", "referans", "asama", "miktar", "karsilanan", "birimFiyat", "paraBirimi"];
  for (const k of kapat) await tik(`[data-rapor-sutun="${k}"]`);
  await tik('[data-rapor-grup="urun"]');
  await tik('[data-rapor-grup="renk"]');
  await sayfa.waitForTimeout(400);
  // SÜTUN AYARLARI (kullanıcı, 12 Eylül): kısa başlık, genişlik, sıra. "Aşama Miktarı" → "Aş.Mik.",
  // 60px; Kalan sona alınıyor (Ürün gruplama alanı — gruplama alanları en solda kalır). Kaydedilince saklanmalı (ikinci açılışta aynı tablo).
  await sayfa.locator('[data-sutun-ad="asamaMiktar"]').fill("Aş.Mik.");
  await sayfa.locator('[data-sutun-genislik="asamaMiktar"]').fill("60");
  await sayfa.evaluate(() => document.querySelector('[data-sutun-ayar="kalan"] button[title="Sona al"]').click());
  await sayfa.waitForTimeout(400);
  const sutunAyari = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    const ths = [...tb.querySelector("thead tr").children];
    const th = ths.find((x) => x.textContent.trim() === "Aş.Mik.");
    return { baslik: ths.map((x) => x.textContent.trim()), genislik: th ? Math.round(th.getBoundingClientRect().width) : null };
  });
  const gruplu = await tablo();

  // KAYDET
  await sayfa.locator("[data-rapor-ad]").fill("Renk bazında kalan");
  await tik("[data-rapor-kaydet]");
  await sayfa.waitForTimeout(1200);
  const tanimlar = await depoOku(sayfa, "tanimlar:data");
  const kayit = ((tanimlar || {}).raporlar || [])[0] || null;
  // Sayaçlar İLERLEMİŞ olabilir (tohum renk ve carilerine kod atanıyor: renk 6-7, cari 13-15);
  // ölçülen 5 ve 12'nin ALTINA düşmemesi. Eski sürümde ikisi de 0'dan başlıyordu (renk 2, cari 3).
  const sayac = (tanimlar || {}).kodSayaclari || {};
  const sayacKorundu = (sayac.renk || 0) >= 5 && (sayac.cari || 0) >= 12;

  // YENİDEN AÇILIŞ → kayıtlı rapor listede, açılınca aynı tablo. Gerçek `reload()` tohumu geri
  // koyuyor (bkz. senaryo-gorsel-depo); kaydedilmiş depo ikinci bir uygulamaya veriliyor.
  const depo = await sayfa.evaluate(() => ({ ...window.__depo }));
  await tarayici.close();
  const ikinci = await uygulamaAc(depo, { hataYaz: false });
  const sayfa2 = ikinci.sayfa;
  await sayfa2.waitForTimeout(2200);
  await sayfa2.getByRole("button", { name: "Sipariş", exact: true }).first().click();
  await sayfa2.waitForTimeout(700);
  const tik2 = (sel) => sayfa2.evaluate((sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);
  await tik2('[data-ust-sekme="raporlar"]');
  await sayfa2.waitForTimeout(500);
  const kayitliVar = await tik2('[data-kayitli-rapor="Renk bazında kalan"]');
  await sayfa2.waitForTimeout(500);
  const acilan = await sayfa2.evaluate(() => {
    const tb = document.querySelector("[data-rapor-tablo]");
    if (!tb) return null;
    const satir = (tr) => [...tr.children].map((td) => td.textContent.trim());
    return {
      baslik: satir(tb.querySelector("thead tr")),
      govde: [...tb.querySelectorAll("tbody tr")].map(satir),
      toplam: tb.querySelector("tfoot tr") ? satir(tb.querySelector("tfoot tr")) : null,
      ozet: (document.querySelector("[data-rapor-ozet]") || {}).textContent,
    };
  });
  await ikinci.tarayici.close();
  return {
    hatalar, raporSekmesiVar, varsayilanMatris, ayarlarKapaliGeldi, resimler,
    duz: { satir: duz && duz.govde.length, sutun: duz && duz.baslik.length, ozet: duz && duz.ozet, asamaSatirlari, asamaIkonlari },
    matris, matrisTekSatir, excel,
    secenekListeleri,
    kolonAramasi: kolonAramasi && { satir: kolonAramasi.govde.length, asamalar: kolonAramasi.govde.map((r) => `${r[kolonAramasi.baslik.indexOf("Aşama")]}:${r[kolonAramasi.baslik.indexOf("Aşama Miktarı")]}`) },
    arama: aramaSonucu && { satir: aramaSonucu.govde.length, ozet: aramaSonucu.ozet, renkler: aramaSonucu.govde.map((r) => r[aramaSonucu.baslik.indexOf("Renk")]) },
    gruplu,
    kayit: kayit && { ad: kayit.ad, modul: kayit.modul, kapsam: kayit.kapsam, gruplar: kayit.tanim.gruplar, sutunSayisi: kayit.tanim.sutunlar.length, sutunAyarlari: kayit.tanim.sutunAyarlari },
    sutunAyari,
    kayitliVar, sayacKorundu,
    acilanAyni: JSON.stringify(acilan) === JSON.stringify(gruplu),
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
