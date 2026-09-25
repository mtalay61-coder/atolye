// SENARYO — ÜST ŞERİTTEKİ PENCERE SEKMESİ KENDİ KAYDINI AÇIYOR (kullanıcı, 11 Eylül).
//
//   "Üst sekmeler düzgün çalışmıyor, stok içinden küçültüyoruz sonra geri dönüşte o stoğu değil
//    stok yönetimini açıyor."
//
// Ölçülen: şeritteki "Ürün: X" sekmesine dokununca EKRANDA X'in kartı mı var, yoksa Stok listesi mi.
// Şeritte hangi sekmenin etkin göründüğü de ölçülüyor — şerit ile ekran aynı şeyi söylemeli.
// Aynı hata sınıfı sipariş ve üretim pencerelerinde de vardı (tek bir "açık kart" değeri); onlar da
// ölçülüyor. Sipariş sekmesi Alış siparişinde bile SATIŞ ekranına götürüyordu.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // İki bekleyen alış siparişi ve iki üretim: "iki kayıt açıkken öncekine dönüş" ölçülebilsin.
  const sip = JSON.parse(TOHUM["siparis:data"]).map((x) => ({ ...x, durum: "Bekliyor" }));
  t["siparis:data"] = JSON.stringify([...sip, { ...sip[0], id: "s2", siparisNo: "AS-2" }]);
  const ur = JSON.parse(TOHUM["uretim:siparisler"]);
  t["uretim:siparisler"] = JSON.stringify([...ur, { ...ur[0], id: "up2", siparisNo: "1002", takipKodu: "1002" }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  const modul = async (ad) => {
    await modulAc(sayfa, ad);   // üst menü (v1.449.0): açılır listedeki düğmeye doğrudan
    await sayfa.waitForTimeout(700);
  };
  // Stok listesinde ürün satırını aç.
  const listedenAc = async (ad) => {
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) =>
        e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };
  const kucult = async () => {
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll('button[title="Sekmede bırak, kapatma"]')]
        .find((x) => x.getBoundingClientRect().height > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(600);
  };
  const kartKapat = async () => {
    await sayfa.evaluate(() => {
      const kart = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Stok Kartı" && s.getBoundingClientRect().height > 0);
      let e = kart;
      while (e && ![...e.querySelectorAll("button")].some((b) => b.textContent.trim() === "Kapat")) e = e.parentElement;
      const b = e && [...e.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kapat");
      if (b) b.click();
    });
    await sayfa.waitForTimeout(700);
  };
  const seritSekmesi = async (baslik) => {
    await sayfa.evaluate((baslik) => {
      const d = [...document.querySelectorAll("div")].find((x) =>
        x.getBoundingClientRect().height > 0 && x.firstChild && x.firstChild.nodeType === 3 && x.firstChild.textContent.trim() === baslik);
      if (d) d.click();
    }, baslik);
    await sayfa.waitForTimeout(800);
  };
  // EKRAN: görünen stok kartının ürün adı (yoksa null) ve Stok listesinin görünüp görünmediği.
  const ekran = () => sayfa.evaluate(() => {
    // TEMA GEÇİŞİ (20 Eylül): etkin sekme zemini artık sabit hex değil, --erp-panel token'ı.
    const olcum = document.createElement("div"); olcum.style.background = "var(--erp-panel)";
    document.body.appendChild(olcum); const panelRengi = getComputedStyle(olcum).backgroundColor; olcum.remove();
    const etiket = [...document.querySelectorAll("span")]
      .find((s) => s.textContent.trim() === "Stok Kartı" && s.getBoundingClientRect().height > 0);
    const kart = etiket ? (etiket.nextElementSibling || {}).textContent || "?" : null;
    // Seritte etkin pencere sekmesi: açık zemin (#FBF6EC) taşıyan pencere sekmesi.
    const etkin = [...document.querySelectorAll("div")].find((x) =>
      x.getBoundingClientRect().height > 0 && x.firstChild && x.firstChild.nodeType === 3 &&
      /^Ürün: /.test(x.firstChild.textContent.trim()) && getComputedStyle(x).backgroundColor === panelRengi);
    return { kart, seritteEtkin: etkin ? etkin.firstChild.textContent.trim() : null };
  });

  const sonuc = {};

  // 1. Tek ürün: aç, küçült, şeritten geri aç.
  await modul("Stok");
  await listedenAc("Deri");
  await kucult();
  await seritSekmesi("Ürün: Deri");
  sonuc.tekUrun = await ekran();

  // 2. İki ürün: Deri küçültülmüşken Bot açılıp küçültülür; şeritten Deri'ye dönülür.
  await kucult();
  await listedenAc("Bot");
  await kucult();
  await seritSekmesi("Ürün: Deri");
  sonuc.ikiUrunDeriyeDonus = await ekran();
  await seritSekmesi("Ürün: Bot");
  sonuc.ikiUrunBotaDonus = await ekran();

  // 3. Başka modüle gidip şeritten ürüne dönüş.
  await kucult();
  await modul("Cari");
  await seritSekmesi("Ürün: Deri");
  sonuc.baskaModuldenDonus = await ekran();

  // 4. Bot kartı KAPATILIR (Deri açık kalmışken). Şerit ile ekran aynı şeyi söylemeli; ardından
  //    şeritten Deri'ye dokunulunca Deri'nin kartı gelmeli.
  await seritSekmesi("Ürün: Bot");
  await kartKapat();
  sonuc.botKapatildiktanSonra = await ekran();
  await seritSekmesi("Ürün: Deri");
  sonuc.kapatmadanSonraDeriyeDonus = await ekran();

  // 5. KART DURUMU KORUNUYOR: Bot'ta Reçete sekmesi açılır, Deri'ye geçilip Bot'a dönülür — Bot
  //    yeniden kurulsaydı Stok Bilgileri'ne (ilk sekme) düşerdi.
  await kucult();
  await modul("Stok");
  await listedenAc("Bot");
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(600);
  await kucult();
  await seritSekmesi("Ürün: Deri");
  await seritSekmesi("Ürün: Bot");
  sonuc.botaDonunceReceteSekmesiDuruyor = {
    ...(await ekran()),
    receteAcik: await sayfa.evaluate(() => [...document.querySelectorAll("button")]
      .some((b) => b.textContent.trim() === "Reçeteye Ekle" && b.getBoundingClientRect().height > 0)),
  };

  // ---- SİPARİŞ VE ÜRETİM ------------------------------------------------------------------------
  // Görünen tam ekran kart: sabit konumlu, yüksek, görünür kap; başlık metninden kaydın numarası.
  const tamEkran = (nitelik) => sayfa.evaluate((nitelik) => {
    const k = [...document.querySelectorAll(`[${nitelik}]`)].find((x) => x.getBoundingClientRect().height > 300);
    return k ? k.getAttribute(nitelik) : null;
  }, nitelik);
  const kucultDugmesi = async () => {
    await sayfa.evaluate(() => {
      const b = [...document.querySelectorAll('button[title="Küçült — sekme çubuğunda kalır"]')]
        .find((x) => x.getBoundingClientRect().height > 0);
      if (b) b.click();
    });
    await sayfa.waitForTimeout(600);
  };
  const tamEkranAc = async (sira) => {
    await sayfa.evaluate((sira) => {
      const d = [...document.querySelectorAll("button[title^='Tam ekran aç']")].filter((x) => x.offsetParent !== null);
      if (d[sira]) d[sira].click();
    }, sira);
    await sayfa.waitForTimeout(800);
  };
  const baslik = () => sayfa.evaluate(() => {
    const h = [...document.querySelectorAll("h1,h2")].find((x) => x.offsetParent !== null);
    return h ? h.textContent.trim() : null;
  });

  await kucult();
  await modul("Alış Siparişi");
  await tamEkranAc(0);
  await kucultDugmesi();
  await seritSekmesi("Alış: AS-1");
  sonuc.siparisTek = { kart: await tamEkran("data-siparis-karti"), ekran: await baslik() };
  await kucultDugmesi();
  await modul("Alış Siparişi");
  await tamEkranAc(1);
  await kucultDugmesi();
  await modul("Cari");
  await seritSekmesi("Alış: AS-1");
  sonuc.siparisIkiliOncekine = { kart: await tamEkran("data-siparis-karti"), ekran: await baslik() };
  await seritSekmesi("Alış: AS-2");
  sonuc.siparisIkiliSonrakine = { kart: await tamEkran("data-siparis-karti") };

  await kucultDugmesi();
  await modul("Üretim");
  await tamEkranAc(0);
  const ilkUretim = await tamEkran("data-uretim-karti");
  await kucultDugmesi();
  await tamEkranAc(1);
  const ikinciUretim = await tamEkran("data-uretim-karti");
  await kucultDugmesi();
  await modul("Stok");
  const uretimBasliklari = await sayfa.evaluate(() => [...document.querySelectorAll("div")]
    .filter((x) => x.getBoundingClientRect().height > 0 && x.firstChild && x.firstChild.nodeType === 3 && /^Üretim: /.test(x.firstChild.textContent.trim()))
    .map((x) => x.firstChild.textContent.trim()));
  await seritSekmesi(uretimBasliklari[0]);
  sonuc.uretimIkiliOncekine = { acilanlar: [ilkUretim, ikinciUretim], kart: await tamEkran("data-uretim-karti") };

  await tarayici.close();
  return { hatalar, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
