// SENARYO — KATALOG GÖRÜNÜMÜ.
//
// Kullanıcı: "Katalog yapalım, aslında bu bizim tarafta stok yönetimi. İlave sekme açmayalım,
// burayı daha katalog gibi kullanalım. 1 büyük resim ve etrafında varyant resimleri listelenecek.
// Ürün bilgileri çekilecek, özel kodlar burada devreye girecek. Fiyatlar çekilecek ama burada ince
// nokta: sadece ana ekrandaki fiyatlar, çünkü özel fiyatlar görünmesi tehlikeli."
//
// Bu senaryonun ASIL İDDİASI o "ince nokta": ürünün cariye özel fiyatı VAR ve katalogda
// GÖRÜNMEMELİ. Bir müşteriye başka bir müşterinin fiyatını göstermek, geri alınamayan bir hata.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const GORSEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const tan = JSON.parse(t["tanimlar:data"]);
  // TİPE GÖRE ALANLAR. "Menşei" genel (her üründe), "Taban" yalnızca Ayakkabı mamul tipinde.
  // Üçüncü ürün başka tipte: tipe özel alanın ONDA GÖRÜNMEDİĞİ de ölçülüyor.
  tan.mamulTipleri = [{ id: "mt1", ad: "Ayakkabı" }, { id: "mt2", ad: "Çanta" }];
  tan.ozelKodAlanlari = [
    { id: "oka-g1", ad: "Menşei", kapsamTuru: "genel", kapsamAd: "" },
    { id: "oka-t1", ad: "Taban", kapsamTuru: "mamul", kapsamAd: "Ayakkabı" },
    // SEZON EKSENİ: bu alan yalnız yazlık üründe çıkmalı.
    { id: "oka-s1", ad: "Yazlık Taban", kapsamTuru: "sezon", kapsamAd: "İlkbahar/Yaz" },
  ];
  t["tanimlar:data"] = JSON.stringify(tan);

  const stok = JSON.parse(t["stok:items"]);
  // HAMMADDEDE DE İKİ AYRI BİRİM: dolarla alınan deri lirayla satılabiliyor. Para birimi
  // mamule özel değil (kullanıcı, 6 Eylül: "p.birimi hem tüm stoklarda olsun").
  stok.push({
    id: "hm1", ad: "Döviz Deri", kategori: "Hammadde", birim: "desi", olcuTipi: "Beden",
    alisFiyati: 3, alisParaBirimi: "$", satisFiyati: 120, satisParaBirimi: "₺",
    variants: [{ renk: "Siyah", beden: "Standart", miktar: 5 }], hareketler: [], recete: [],
  });
  stok.push({
    id: "kat1", ad: "Katalog Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    // DÖVİZLİ SATIŞ: alış ₺, satış €. Önceden ikisi de alışın birimiyle basılıyordu.
    satisFiyati: 990, alisFiyati: 410, alisParaBirimi: "₺", satisParaBirimi: "€",
    // CARİYE ÖZEL FİYAT — katalogda ASLA görünmemeli.
    fiyatKurallari: [{ tip: "Satış", kapsam: "cari", deger: "c2", fiyat: 555 }],
    mamulTipi: "Ayakkabı", sezon: "İlkbahar/Yaz",
    ozelKodlar: { "oka-g1": "İtalya", "oka-t1": "Kauçuk", "oka-s1": "TPU" },
    kapakResmi: GORSEL, renkResimleri: { Siyah: GORSEL, Taba: GORSEL },
    variants: [
      { renk: "Siyah", beden: "40", miktar: 7 }, { renk: "Siyah", beden: "41", miktar: 0 },
      { renk: "Taba", beden: "40", miktar: 3 },
    ],
    hareketler: [], recete: [],
  });
  stok.push({
    id: "kat2", ad: "Diğer Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    // AYNI TİP, BAŞKA SEZON: "Yazlık Taban" alanı bu üründe ÇIKMAMALI.
    satisFiyati: 700, mamulTipi: "Ayakkabı", sezon: "Sonbahar/Kış",
    ozelKodlar: { "oka-g1": "Fransa", "oka-t1": "Deri" },
    variants: [{ renk: "Siyah", beden: "40", miktar: 2 }], hareketler: [], recete: [],
  });
  // Tipe özel alanı OLMAYAN üçüncü ürün: "Taban" süzgecinin elediği kayıt.
  stok.push({
    id: "kat3", ad: "Çanta Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    // BAŞKA TİP: "Taban" alanı bu üründe görünmemeli, "Menşei" (genel) görünmeli.
    satisFiyati: 500, mamulTipi: "Çanta", ozelKodlar: { "oka-g1": "Türkiye" },
    variants: [{ renk: "Siyah", beden: "40", miktar: 1 }], hareketler: [], recete: [],
  });
  // HAMMADDEDE SATIŞ FİYATI (kullanıcı, 6 Eylül). Atölye artan deriyi satabiliyor; fiyatın
  // ürün kartında görünmesi ve kaydın içinde durması ölçülüyor.
  stok.push({
    id: "ham1", ad: "Artan Deri", kategori: "Hammadde", birim: "desi", olcuTipi: "Beden",
    alisFiyati: 22, alisParaBirimi: "₺", satisFiyati: 45,
    variants: [{ renk: "Siyah", beden: "Standart", miktar: 30 }], hareketler: [], recete: [],
  });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- TANIMLAR: ETİKETLER GERÇEKTEN GÖRÜNÜYOR MU ---------------------------------------------
  //
  // Kullanıcı "Tanımlarda boş çıkıyor" dedi. Ekran listeyi `map` ile çiziyor; liste boşsa hiç kutu
  // görünmüyor ve alan eklemenin yolu kalmıyordu. Burada BEŞ kutunun çizildiği ve tohumdaki
  // başlıkların yerinde olduğu ölçülüyor.
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Ürün"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const tanimEkrani = await sayfa.evaluate(() => {
    const kutular = [...document.querySelectorAll('input[title^="Alan başlığı"]')];
    const m = document.body.innerText;
    return {
      alanSayisi: kutular.length,
      basliklar: kutular.map((i) => i.value),
      // Kapsam başlıkları: alanların hangi ürünlerde çıktığı gruplanarak gösteriliyor.
      genelGrubuVar: /GENEL — HER ÜRÜNDE/.test(m),
      tipGrubuVar: /MAMUL TİPİ: AYAKKABI/.test(m),
      sezonGrubuVar: /SEZON: İLKBAHAR\/YAZ/.test(m),
      // Değerlerin NEREDE girildiği ekranda yazılı olmalı.
      yolTarifiVar: /Özel Kod Alanları bölümünden/.test(m),
    };
  });

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(800);

  // SIKI BAŞLIK (kullanıcı, 12 Eylül: "ekranın yarısına yakını arama, sekme vs."): Liste/Katalog
  // anahtarı kategori sekmeleriyle AYNI satırda; ilk ürün kartı başlığa 200 px'den yakın (900 px
  // genişlikte; eski düzende 237 px'ti).
  await sayfa.setViewportSize({ width: 900, height: 1200 });
  await sayfa.waitForTimeout(400);
  const sikiBaslik = await sayfa.evaluate(() => {
    const gorunur = (e) => e && e.getBoundingClientRect().height > 0;
    const liste = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Liste" && gorunur(b));
    const tumu = [...document.querySelectorAll("button")].find((b) => /^Tümü/.test(b.textContent.trim()) && gorunur(b));
    const kart = [...document.querySelectorAll("button")].find((b) => /renk\/beden/.test(b.textContent) && gorunur(b));
    const h1 = document.querySelector("h1");
    return {
      anahtarSekmelerleAyniSatirda: !!(liste && tumu) && Math.abs(liste.getBoundingClientRect().top - tumu.getBoundingClientRect().top) < 12,
      ilkKartBasligaYakin: !!(kart && h1) && (kart.getBoundingClientRect().top - h1.getBoundingClientRect().top) < 200,
    };
  });
  // KATALOG AYRI SEKME DEĞİL: aynı ekranda görünüm anahtarı.
  const anahtarVar = await sayfa.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Katalog"));
  await sayfa.locator('button:has-text("Katalog"):visible').first().click();
  await sayfa.waitForTimeout(700);

  const izgara = await sayfa.evaluate(() => ({
    urunGorunuyor: /Katalog Model/.test(document.body.innerText),
    anaFiyatGorunuyor: /990/.test(document.body.innerText),
    // Cariye özel fiyat ızgarada da olmamalı.
    ozelFiyatSizdi: /555/.test(document.body.innerText),
  }));

  await sayfa.locator('button:has-text("Katalog Model"):visible').first().click();
  await sayfa.waitForTimeout(700);

  // DETAY TIKLANAN KARTIN YANINDA AÇILMALI (kullanıcı bildirdi, 6 Eylül): önceden ızgaranın
  // ÜSTÜNDE açılıyordu ve aşağıdaki bir karta tıklayan kullanıcı yukarı kaydırmak zorundaydı.
  // Ölçü: detay panelinin üst kenarı, tıklanan kartın üst kenarından AŞAĞIDA olmalı.
  const detayKonumu = await sayfa.evaluate(() => {
    const kart = [...document.querySelectorAll("button")]
      .find((b) => /Katalog Model/.test(b.textContent) && b.querySelector("img"));
    // Detay sarmalayıcısı ızgaranın tam satırını kaplıyor; onu stiliyle buluyoruz, metinle
    // ararsak büyük bir ata öge yakalanıyor ve konum ölçümü anlamsızlaşıyor.
    const panel = [...document.querySelectorAll("div")]
      .find((d) => d.style && d.style.gridColumn === "1 / -1");
    if (!kart || !panel) return { olcum: "bulunamadı" };
    const k = kart.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return { detayKartinAltinda: p.top >= k.top };
  });

  const detay = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      // Büyük görsel + varyant küçük görselleri.
      buyukGorselVar: !!document.querySelector('img[alt="Katalog Model"]'),
      varyantGorselSayisi: document.querySelectorAll('img[alt="Siyah"], img[alt="Taba"]').length,
      // Özel kodlar: dolu olanlar görünür, boş olanlar çizilmez.
      ozelKodGorunuyor: /Menşei/.test(m) && /İtalya/.test(m) && /Kauçuk/.test(m),
      anaSatisFiyati: /990/.test(m),
      // PERSONEL görünümünde alış fiyatı ve stok adetleri görünür.
      alisFiyatiGorunuyor: /(^|[^.\d])410([^.\d]|$)/.test(m),
      satisBirimiDogru: /990 €/.test(m),
      alisBirimiDogru: /410 ₺/.test(m),
      // ÖZEL FİYAT HİÇBİR YERDE OLMAMALI.
      ozelFiyatSizdi: /555/.test(m),
    };
  });

  // MÜŞTERİ GÖRÜNÜMÜ — maliyet tarafı kapanmalı.
  // 410 ARAMASI (22 Eylül): düz /410/ sürüm numarasına (1.410.0) takılıyordu — nokta ve rakamla
  // çevrili 410 sayılmıyor.
  await sayfa.locator('button:has-text("Personel görünümü"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const musteri = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      dugmeDegisti: /Müşteri görünümü/.test(m),
      satisFiyatiHalaVar: /990/.test(m),
      alisFiyatiGizlendi: !/(^|[^.\d])410([^.\d]|$)/.test(m),
      ozelFiyatSizdi: /555/.test(m),
      // Müşteriye adet değil varlık gösteriliyor; "ÖLÇÜ / STOK" başlığı yerini alıyor.
      olcuBasligiDegisti: /MEVCUT ÖLÇÜLER/.test(m),
    };
  });

  // ---- ÖZEL KODLAR: LİSTEDE, ARAMADA VE SÜZGEÇTE ----------------------------------------------
  //
  // Kullanıcı: "Özel kod dolu ise görünsün; örn. Özel kod 1 taban ise 'Taban: 147' yazsın.
  // Ürün aramada taban filtreleyerek arama vs. yapılır."
  await sayfa.locator('button:has-text("Liste"):visible').first().click();
  await sayfa.waitForTimeout(600);

  // ---- TEK SÜZGEÇ: ARAMA ÇUBUĞU ----------------------------------------------------------------
  //
  // Kullanıcı (6 Eylül): "Stok yönetimi ekranı çok dolu, filtreler her tarafı kapattı. Üstteki
  // hepsini kapat, arama çubuğundan filtre yapalım sadece."
  //
  // Beş açılır süzgeç (malzeme tipi, mamul tipi, sezon, sezon yılı, özel kod + değeri) ve tip
  // çipleri kaldırıldı; hepsi ARAMANIN İÇİNE alındı.
  const aramaSuzgeci = await sayfa.evaluate(() => ({
    // Ekranda açılır süzgeç KALMAMALI (kategori sekmeleri düğme, select değil).
    acilirSuzgecSayisi: [...document.querySelectorAll("select")]
      .filter((x) => x.getBoundingClientRect().width > 0).length,
  }));

  const listeRozeti = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    // Hammaddenin satış fiyatı KENDİ biriminde listeleniyor; önceden yalnız mamulde ve hep "₺".
    const hammaddeSatisi = /120 ₺/.test(m);
    // Etiketiyle birlikte: çıplak bir "İtalya", hangi alana ait olduğunu söylemiyordu.
    return {
      etiketliRozet: /Menşei: İtalya/.test(m) && /Taban: Kauçuk/.test(m),
      // Sezona bağlı alan YALNIZ yazlık üründe rozet oluyor; kışlık üründe kod hiç yok.
      sezonAlaniYazlikta: /Yazlık Taban: TPU/.test(m),
      sezonAlaniKislikta: /Yazlık Taban: Deri/.test(m),
      hammaddeSatisi,
    };
  });

  // HAMMADDE KARTINDA SATIŞ FİYATI. Eskiden bu alan hammaddede hiç çizilmiyordu ve yeni ürün
  // formunda girilen değer kayıt sırasında sıfıra çekiliyordu.
  await sayfa.locator('button:has-text("Artan Deri"):visible').first().click();
  await sayfa.waitForTimeout(900);
  const hammaddeKarti = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      satisGorunuyor: /Satış:\s*45,00 ₺/.test(m) || /Satış:\s*45\.00 ₺/.test(m),
      alisHalaVar: /Alış:\s*22/.test(m),
    };
  });
  await sayfa.locator('button:has-text("Kapat"):visible').first().click();
  await sayfa.waitForTimeout(600);

  // ARAMA: etikete göre. "taban" yazmak, taban kodu dolu olan ürünleri getirmeli.
  const arama = sayfa.locator('input[placeholder^="Ara: ürün"]:visible').first();
  await arama.fill("taban");
  await sayfa.waitForTimeout(500);
  const etiketleAra = await sayfa.evaluate(() => ({
    ikisiDeVar: /Katalog Model/.test(document.body.innerText) && /Diğer Model/.test(document.body.innerText),
    tipiTutmayanElendi: !/Çanta Model/.test(document.body.innerText),
  }));

  // ARAMA: değere göre. "Kauçuk" yalnızca o ürünü getirmeli.
  await arama.fill("Kauçuk");
  await sayfa.waitForTimeout(500);
  const degerleAra = await sayfa.evaluate(() => ({
    dogruUrun: /Katalog Model/.test(document.body.innerText),
    digeriElendi: !/Diğer Model/.test(document.body.innerText),
  }));
  await arama.fill("");
  await sayfa.waitForTimeout(400);

  // ÇOK KELİMELİ ARAMA — açılır süzgeçlerin yerini alan yol (v1.174.0).
  //
  // Eskiden burada iki aşamalı bir süzgeç vardı (önce hangi kod, sonra hangi değer). Beş açılır
  // süzgeç ekranın üstünü kapladığı için hepsi kaldırıldı ve aramanın içine alındı; kelimeler
  // BOŞLUKLA ayrılıyor ve hepsini birden taşıyan ürünler listeleniyor.
  await arama.fill("mamul kauçuk");
  await sayfa.waitForTimeout(500);
  const cokKelime = await sayfa.evaluate(() => ({
    dogruUrun: /Katalog Model/.test(document.body.innerText),
    digeriElendi: !/Diğer Model/.test(document.body.innerText),
  }));
  // KELİME SIRASI ÖNEMSİZ: tek dize olarak arasaydık "kauçuk mamul" hiçbir şey bulmazdı.
  await arama.fill("kauçuk mamul");
  await sayfa.waitForTimeout(500);
  const sirasizAyniSonuc = await sayfa.evaluate(() => /Katalog Model/.test(document.body.innerText));
  await arama.fill("");
  await sayfa.waitForTimeout(400);

  // ---- SİPARİŞ EKRANINDA DA ARANIYOR ----------------------------------------------------------
  //
  // Özel kod yalnız Stok'ta aransaydı "taban 147'yi Stok'ta buluyorum ama siparişte bulamıyorum"
  // olurdu. Aynı havuz ürün seçicisine de verildi; eşleşme SEBEBİ de rozetle gösteriliyor,
  // yoksa kullanıcı o satırın neden geldiğini bilemezdi.
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);
  const secici = sayfa.locator('input[placeholder="Model ara…"]:visible').first();
  await secici.click();
  await secici.fill("Kauçuk");
  await sayfa.waitForTimeout(600);
  const siparisAramasi = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      dogruUrun: /Katalog Model/.test(m),
      digeriElendi: !/Diğer Model/.test(m),
      // Eşleşmenin sebebi rozette yazılı.
      sebepGorunuyor: /Taban: Kauçuk/.test(m),
    };
  });

  await tarayici.close();
  return { hatalar, sikiBaslik, anahtarVar, aramaSuzgeci, izgara, detay, detayKonumu, musteri, listeRozeti, hammaddeKarti, etiketleAra, degerleAra, cokKelime, sirasizAyniSonuc, siparisAramasi, tanimEkrani };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
