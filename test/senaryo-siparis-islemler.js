// SENARYO — SİPARİŞ: OKUTMA VURGUSU, İŞLEMLER MENÜSÜ, ÇIKTIDA ÖDEMELER (8 Ekim, v1.615.0).
// Kullanıcı: "Barkod okutunca sipariş satırı da vurgulansın, siparişte üst bara mouse sağ tıklama gibi tuş ekle, işlemler
// diyebilirsin, tahsilat içinde olsun, tıklayınca cari tahsilat ekranı açsın, içinde olduğumuz sipariş no atayarak
// tahsilat girsin. Sipariş yazdırda siparişin altında bağlantılı ödeme görünsün."
// Ölçülen:
//   A) Yeni sipariş formunda asorti barkodu okutulur → eklenen satır vurgulu (data-okutulan-satir), okutulan ölçüler
//      işaretli (5 hücre); 2,5 sn sonra vurgu söner. Form kapatılıp yeni sipariş açılınca okutma sonucu yok.
//   B) SAT-9 (250 USD, 100 USD tahsil edilmiş) kartında "İşlemler" → menü: Tahsilat; şeride sağ tık da menüyü açar.
//      Tahsilat → Cari ekranı, Müşteri B kartında form: tutar 150 (kalan), USD, "Sipariş SAT-9".
//   C) Çıktı HTML'inde hesap özeti: Sipariş toplamı, "− 100 $" tahsilat satırı (THS-1005001, USD Kasa), KALAN BAKİYE 150 $.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  tan.asortiler = [{ id: "as1", ad: "Standart 8li", oranlar: [{ beden: "36", oran: 1 }, { beden: "37", oran: 2 }, { beden: "38", oran: 2 }, { beden: "39", oran: 2 }, { beden: "40", oran: 1 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: 10 })), hareketler: [], recete: [], birimFiyat: 465 });
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{ id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-01", kalemler: [
    { id: "sk9", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD" }] }]);
  const c = JSON.parse(t["cari:data"]);
  c.find((x) => x.id === "c2").hareketler = [{ id: "h1", tarih: "2026-10-05", yon: "Alacak", tutar: 100, paraBirimi: "USD", fisNo: "THS-1005001",
    siparisId: "s9", siparisNo: "SAT-9", aciklama: "Tahsilat (USD Kasa): Sipariş SAT-9", hesapAd: "USD Kasa", hesapPB: "USD", hesapTutar: 100, defter: "Genel", odemeSekli: "Nakit" }];
  t["cari:data"] = JSON.stringify(c);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- A) okutma vurgusu: kodları ata, yeni siparişte asorti okut.
  await modulAc(sayfa, "Paketleme"); await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);
  const st = await depoOku(sayfa, "stok:items"); const tn = await depoOku(sayfa, "tanimlar:data");
  const urun = st.find((u) => u.id === "m125");
  const hane = (n, h) => String(n).padStart(h, "0");
  const kodAsorti = `90${hane(urun.stokNo, 4)}${hane(((tn.renkler || []).find((r) => r.ad === "Siyah") || {}).barkodKodu, 4)}${hane(((tn.asortiler || []).find((a) => a.id === "as1") || {}).barkodKodu, 3)}`;
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(700);
  await sayfa.locator('select:has(option:text-is("Müşteri B"))').first().selectOption({ label: "Müşteri B" });
  await sayfa.locator("[data-barkod-paneli-ac]:visible").first().click(); await sayfa.waitForTimeout(200);
  const kutu = sayfa.locator('input[title="Barkod"]:visible').first();
  await kutu.fill(kodAsorti); await kutu.press("Enter");
  await sayfa.waitForTimeout(400);
  const vurgu = await sayfa.evaluate(() => ({
    satir: document.querySelectorAll("[data-okutulan-satir]").length,
    hucre: document.querySelectorAll("[data-okutulan-hucre]").length,
  }));
  await sayfa.waitForTimeout(2600);
  const vurguSondu = await sayfa.evaluate(() => document.querySelectorAll("[data-okutulan-satir]").length === 0);
  // Formu kapat (Vazgeç) → yeni sipariş: önceki okutmanın sonucu yok.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Vazgeç/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(600);
  const eskiSonucYok = await sayfa.evaluate(() => !document.querySelector("[data-barkod-sonuc]") || ![...document.querySelectorAll("[data-barkod-sonuc]")].some((x) => x.offsetParent));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Vazgeç/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  // ---- B) İşlemler menüsü.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-9"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const menuOge = () => sayfa.evaluate(() => {
    const m = document.querySelector("[data-siparis-islem-menusu]");
    return m ? { baslik: /SAT-9/.test(m.textContent), ogeler: [...m.querySelectorAll("[data-siparis-islem]")].map((b) => b.getAttribute("data-siparis-islem") + ":" + b.textContent.replace(/\s+/g, " ").trim()) } : null;
  });
  await sayfa.locator("[data-siparis-islemler]:visible").first().click(); await sayfa.waitForTimeout(300);
  const dugmeMenusu = await menuOge();
  await sayfa.mouse.click(700, 900); await sayfa.waitForTimeout(200);
  const kapandi = await sayfa.evaluate(() => !document.querySelector("[data-siparis-islem-menusu]"));
  const serit = sayfa.locator("[data-siparis-ust-serit]:visible").first();
  await serit.click({ button: "right", position: { x: 6, y: 6 } }); await sayfa.waitForTimeout(300);
  const sagTikMenusu = await menuOge();
  await sayfa.locator('[data-siparis-islem="odeme"]').first().click(); await sayfa.waitForTimeout(1100);
  const cariFormu = await sayfa.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const s = [...document.querySelectorAll("[data-cari-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0);
    return { cariEkrani: !!s, kart: s && /Müşteri B/.test(s.textContent) ? "Müşteri B" : null,
      tutar: q("[data-cari-hareket-tutar]") && q("[data-cari-hareket-tutar]").value, pb: q("[data-cari-hareket-pb]") && q("[data-cari-hareket-pb]").value,
      aciklama: q("[data-cari-hareket-aciklama]") && q("[data-cari-hareket-aciklama]").value };
  });

  // ---- C) çıktı HTML'i (PaylaşŞeridi'nin kullandığı gövde): sayfadaki fonksiyonla, depodaki veriden.
  await tarayici.close();
  const erp = require("./erp.cjs");
  const sip = JSON.parse(t["siparis:data"])[0];
  const html = erp.siparisCiktisiHTML(sip, c.find((x) => x.id === "c2"), {}, stok);
  const cikti = {
    bolum: (html.match(/data-cikti-odemeler="(\d+)"/) || [])[1] || null,
    // v1.617.0: hesap özeti — Sipariş toplamı, eksi tahsilat satırı, KALAN BAKİYE.
    baslik: /Sipariş toplamı/.test(html) && /KALAN BAKİYE/.test(html), fis: /THS-1005001/.test(html), kasa: /USD Kasa/.test(html),
    eksiSatir: /−\s*100 \$/.test(html),
    kalan: (html.match(/data-cikti-kalan="([\d.]+)"/) || [])[1] || null,
  };
  const odemesiz = erp.siparisCiktisiHTML(sip, { ...c.find((x) => x.id === "c2"), hareketler: [] }, {}, stok);
  cikti.odemesizBolumYok = !/data-cikti-odemeler/.test(odemesiz);
  return { hatalar, vurgu, vurguSondu, eskiSonucYok, dugmeMenusu, kapandi, sagTikMenusu, cariFormu, cikti };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
}
module.exports = { calistir };
