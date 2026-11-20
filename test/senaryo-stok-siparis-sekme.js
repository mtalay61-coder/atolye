// SENARYO — STOK KARTINDAN SİPARİŞ AYRI SEKMEDE; KAPATINCA STOK KARTINA DÖNÜŞ (v1.744.26, kullanıcı 20 Kasım).
//
//   "Stok kartı içerisinden siparişlere tıklayınca üst sekme anlaşılmıyor ve siparişi açıyor, kapatınca stok kartı da
//    kapanıyor. Siparişe tıklayınca ayrı sekmede siparişi açsın, sekmedeki siparişi kapatınca geri stoğa dönsün."
//   "Siparişi filtreleyip açıyor, sekme olarak açsın."
//
// Ölçülen (mamul Bot ve hammadde Deri kartı için ayrı ayrı):
//   - Siparişler sekmesindeki satıra tıklayınca: görünen tam ekran sipariş kartı, şeritte etkin pencere sekmesi, şeritteki
//     pencere sekmeleri (ürün sekmesi KALIYOR, sipariş sekmesi EKLENİYOR), sipariş listesinin arama kutusu (süzülmemeli).
//   - Sipariş kartı "Kapat" ile kapatılınca: görünen stok kartı (aynı ürün), şeritte etkin sekme, sipariş sekmesi kalktı mı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const sip = JSON.parse(TOHUM["siparis:data"]).map((x) => ({ ...x, durum: "Bekliyor" }));
  t["siparis:data"] = JSON.stringify(sip);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  const modul = async (ad) => { await modulAc(sayfa, ad); await sayfa.waitForTimeout(700); };
  const listedenAc = async (ad) => {
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) =>
        e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };
  const dugme = async (metinBas) => {
    const ok = await sayfa.evaluate((metinBas) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().height > 0 && x.textContent.trim().startsWith(metinBas));
      if (b) { b.click(); return true; } return false;
    }, metinBas);
    await sayfa.waitForTimeout(800);
    return ok;
  };
  // Stok kartı › Siparişler listesindeki sipariş satırı (sipariş numarasını taşıyan düğme)
  const siparisSatiri = async (no) => {
    const ok = await sayfa.evaluate((no) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().height > 0
        && [...x.querySelectorAll("span")].some((s) => s.textContent.trim() === no));
      if (b) { b.click(); return true; } return false;
    }, no);
    await sayfa.waitForTimeout(1000);
    return ok;
  };
  const siparisKartiniKapat = async () => {
    await sayfa.evaluate(() => {
      const k = [...document.querySelectorAll("[data-siparis-karti]")].find((x) => x.getBoundingClientRect().height > 300);
      const b = k && [...k.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kapat" && x.getBoundingClientRect().height > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(1000);
  };
  const ekran = () => sayfa.evaluate(() => {
    const olcum = document.createElement("div"); olcum.style.background = "var(--erp-panel)";
    document.body.appendChild(olcum); const panelRengi = getComputedStyle(olcum).backgroundColor; olcum.remove();
    const etiket = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Stok Kartı" && s.getBoundingClientRect().height > 0);
    const stokKarti = etiket ? (etiket.nextElementSibling || {}).textContent || "?" : null;
    const sk = [...document.querySelectorAll("[data-siparis-karti]")].find((x) => x.getBoundingClientRect().height > 300);
    const seritte = [...document.querySelectorAll("[data-serit-pencere]")].filter((x) => x.getBoundingClientRect().height > 0);
    const etkin = seritte.find((x) => getComputedStyle(x).backgroundColor === panelRengi);
    // sipariş listesinin arama kutusu (modül görünürse): süzülmüşse sipariş numarası yazılı olurdu
    const ara = [...document.querySelectorAll("input")].find((i) => i.getBoundingClientRect().height > 0 && /sipariş/i.test(i.placeholder || "") && i.value);
    return {
      stokKarti,
      siparisKarti: sk ? sk.getAttribute("data-siparis-karti") : null,
      seritteEtkin: etkin ? etkin.textContent.trim() : null,
      seritPencereleri: seritte.map((x) => x.textContent.trim()),
      aramaSuzulmus: ara ? ara.value : null,
    };
  });

  const sonuc = {};
  for (const [modulAdi, urun] of [["Ürün Stok", "Bot"], ["Stok", "Deri"]]) {
    await modul(modulAdi);
    await listedenAc(urun);
    const onceStok = (await ekran()).stokKarti;
    const sekme = await dugme("Siparişler (");
    const tik = await siparisSatiri("AS-1");
    const acilinca = await ekran();
    await siparisKartiniKapat();
    const kapaninca = await ekran();
    sonuc[urun] = { onceStok, siparislerSekmesi: sekme, satirTiklandi: tik, acilinca, kapaninca };
    // sonraki tur için ürün kartını kapat (şeritten X)
    await sayfa.evaluate((baslik) => {
      const d = [...document.querySelectorAll("[data-serit-pencere]")].find((x) => x.getBoundingClientRect().height > 0 && x.textContent.trim() === baslik);
      const x = d && d.querySelector("button"); if (x) x.click();
    }, `Ürün: ${urun}`);
    await sayfa.waitForTimeout(700);
  }

  await tarayici.close();
  return { hatalar, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
