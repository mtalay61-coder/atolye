// SENARYO — BARKODLA ATÖLYE, UÇTAN UCA.
//
// Kullanıcı bildirdi: "Barkod sadece alma işlemi yapıyor, teslim etmeyi göremedim."
// Sebep: teslim alma fonksiyonuna yanlış biçimde veri gönderiliyordu (`bedenMiktarlari` yerine
// `saglam` bekleniyor). Fonksiyon sağlam haritasını boş buluyor, toplamı sıfır çıkıyor ve
// SESSİZCE dönüyordu — ekranda hiçbir şey olmuyordu.
//
// Bu senaryo o akışı uçtan uca yürütüyor: personel okut → iş al → tekrar okut → teslim et.
// Bir önceki sürümde bu ekran yalnızca birim testleriyle kapsanmıştı ve hata tam oradan sızdı.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  cariler.find((c) => c.id === "c3").barkodKodu = "PRS-1";
  cariler.find((c) => c.id === "c3").bagliProsesler = ["Kesim", "Saya"];
  t["cari:data"] = JSON.stringify(cariler);
  // Kesim adımı HENÜZ verilmemiş bir üretim: 32 çift, tek beden.
  t["uretim:siparisler"] = JSON.stringify([{
    id: "u9", siparisNo: "2001", takipKodu: "2001", model: "Bot", urunId: "u2", renk: "Siyah",
    adet: 32, bedenMiktarlari: [{ beden: "41", miktar: 20 }, { beden: "42", miktar: 12 }], beden: "Siyah · 41:20, 42:12",
    stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [
      { proses: "Kesim", sira: 1, verildiMi: false, tamamlandiMi: false, atamalar: [] },
      { proses: "Saya", sira: 2, verildiMi: false, tamamlandiMi: false, atamalar: [] },
    ],
  }]);

  // İkinci bir üretim: akordeon davranışı ancak iki kartla sınanabilir.
  const uretimler = JSON.parse(t["uretim:siparisler"]);
  uretimler.push({
    ...uretimler[0], id: "u10", siparisNo: "2002", takipKodu: "2002",
    prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: false, tamamlandiMi: false, atamalar: [] }],
  });
  t["uretim:siparisler"] = JSON.stringify(uretimler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(600);

  // ÜRETİM BARKODU ÜRETİM KARTINDAN BASILIYOR — işin başında bir kez.
  await sayfa.getByText("2001", { exact: true }).last().click();
  await sayfa.waitForTimeout(700);

  // AKORDEON: ikinci karta tıklayınca birincisi kapanmalı. Hepsinin birden açık kalması,
  // uzun kartlarda listede gezinmeyi imkânsızlaştırıyordu.
  const acikKartSayisi = () => sayfa.evaluate(() => document.body.innerText.split("Prosesler").length - 1);
  const birinciAcik = await acikKartSayisi();
  await sayfa.getByText("2002", { exact: true }).last().click();
  await sayfa.waitForTimeout(600);
  const ikinciAcik = await acikKartSayisi();
  // Geri dön: sonraki adımlar 2001 kartını bekliyor.
  await sayfa.getByText("2001", { exact: true }).last().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { window.print = () => {}; });
  await sayfa.locator('button[title^="Bu üretimin barkod etiketini bas"]:visible').first().click();
  await sayfa.waitForTimeout(700);
  const uretimEtiketi = await sayfa.evaluate(() => {
    const c = [...document.querySelectorAll("iframe")].pop();
    if (!c) return null;
    const d = c.contentWindow.document;
    return {
      boyut: (d.querySelector("style").textContent.match(/@page \{ size: ([^;]+);/) || [])[1],
      sayfaSayisi: d.querySelectorAll(".etiket").length,
      barkodVar: d.querySelectorAll("svg").length,
      kodYazili: /2001/.test(d.body.innerText),
    };
  });
  await sayfa.waitForTimeout(1800);

  // İŞ EMRİ — barkod etiketinden AYRI belge: A4, model görseli, müşteri, proses bazlı hammadde.
  await sayfa.locator('button[title^="İş emri (A4)"]:visible').first().click();
  await sayfa.waitForTimeout(700);
  const isEmri = await sayfa.evaluate(() => {
    const c = [...document.querySelectorAll("iframe")].pop();
    if (!c) return null;
    const d = c.contentWindow.document;
    const metin = d.body.innerText.replace(/\s+/g, " ");
    return {
      boyut: (d.querySelector("style").textContent.match(/@page \{ size: ([^;]+);/) || [])[1],
      barkodVar: d.querySelectorAll("svg").length,
      // Proses başlıkları ve reçeteden gelen hammadde satırı
      kesimBasligi: /1\. Kesim/.test(metin),
      sayaBasligi: /2\. Saya/.test(metin),
      hammaddeYazili: /Deri/.test(metin),
      // MATRİS: bedenler SÜTUN olmalı, alt alta satır değil.
      bedenSutunlari: [...d.querySelectorAll("thead th")].map((x) => x.textContent.trim()),
      // Deri iki satır (Siyah her bedene, Taba yalnızca 42'ye) — beden başına ayrı satır DEĞİL.
      hammaddeSatirSayisi: d.querySelectorAll("tbody tr").length,
      // BEDEN-BEDEN EŞLEŞMESİ TEK SATIR: "Taban" iki bedene giriyor ama satır sayısı artmıyor;
      // hammaddenin bedeni hücrenin içinde yazıyor.
      tabanSatirSayisi: [...d.querySelectorAll("tbody tr")].filter((tr) => /Taban/.test(tr.textContent)).length,
      tabanHucreleri: [...d.querySelectorAll("tbody tr")]
        .filter((tr) => /Taban/.test(tr.textContent))
        .map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).join(" | "))[0] || "",
      // Hammaddesi olmayan proses de yazılmalı: personel "tablo eksik mi" diye sormasın.
      bosProsesAciklamasi: /hammadde çıkışı yok/.test(metin),
      bedenDagilimi: /32 çift/.test(metin),
    };
  });
  await sayfa.waitForTimeout(1800);

  await sayfa.locator('button:has-text("Barkod Okut"):visible').click();
  await sayfa.waitForTimeout(500);

  const kutu = sayfa.locator('input[title="Barkod"]');
  const okut = async (kod) => { await kutu.fill(kod); await kutu.press("Enter"); await sayfa.waitForTimeout(700); };

  // 1) PERSONEL GİRİŞİ — "Okut" DÜĞMESİYLE.
  //
  // Tetikleyici açık olmalı: Enter ya da düğme. Bir ara "yazma durunca kendiliğinden okut"
  // denenmişti; kodlar elle de girildiği için yazarken verilen duraklamalar yarım kodu okutuyordu
  // ve kullanıcı bunu iptal ettirdi. Bu adım düğmeyi sınıyor, aşağıdaki adımlar Enter'ı.
  await kutu.fill("PRS-1");
  await sayfa.locator('button[title="Kutudaki kodu okut"]:visible').click();
  await sayfa.waitForTimeout(700);
  const girisSonrasi = await sayfa.evaluate(() => ({
    kisiGorunuyor: /Personel C/.test(document.body.innerText),
    alinabilir: /Alabileceğim işler \(1\)/.test(document.body.innerText),
    elindeki: /Elimdeki işler \(0\)/.test(document.body.innerText),
  }));

  // 2) KISMİ ALMA — 32 çiftin 12'si. Kullanıcının belirttiği bölünme durumu:
  // "32 çift olarak gelen ürün 12 çift başka kalfaya, 20 çift başka kalfaya gidebilir."
  await sayfa.locator('input[title="Alınacak miktar"]').fill("12");
  await okut("2001");
  const kismiAlma = await sayfa.evaluate(() => ({
    mesaj: /12 çift alındı/.test(document.body.innerText),
    kalanUyarisi: /20 çift başkasına kaldı/.test(document.body.innerText),
    // Kalan iş hâlâ alınabilir listesinde durmalı: ikinci kalfa için.
    halaAlinabilir: /Alabileceğim işler \(1\)/.test(document.body.innerText),
    elindeki: /Elimdeki işler \(1\)/.test(document.body.innerText),
  }));
  const ilkAtama = (((await depoOku(sayfa, "uretim:siparisler")) || [])[0].prosesIlerleme[0].atamalar || [])[0] || {};

  // 3) TESLİM — PARÇA KODUYLA. Üretim bölündüğü için iş artık parça kodlarıyla yürüyor;
  // kalfanın elindeki bohçanın etiketi "2001-1".
  await okut("2001-1");
  const teslimSonrasi = await sayfa.evaluate(() => ({
    mesaj: /12 çift teslim edildi/.test(document.body.innerText),
    elindeki: /Elimdeki işler \(0\)/.test(document.body.innerText),
  }));
  const teslimSonrasiAtama = (((await depoOku(sayfa, "uretim:siparisler")) || [])[0].prosesIlerleme[0].atamalar || [])[0] || {};

  // 4) KALANI AL — miktar boş, yani kalanın tamamı (20). Yeni parça 2001-2 olmalı.
  await okut("2001");
  const kalaniAlma = await sayfa.evaluate(() => /20 çift alındı/.test(document.body.innerText));
  // YERLEŞİM: solda alabileceği, sağda elindeki; altta bu oturumda teslim ettikleri.
  const yerlesim = await sayfa.evaluate(() => {
    const metin = document.body.innerText;
    const solIndex = metin.indexOf("Alabileceğim işler");
    const sagIndex = metin.indexOf("Elimdeki işler");
    const altIndex = metin.indexOf("Bu oturumda teslim ettiklerim");
    return {
      alabilecegiSolda: solIndex >= 0 && sagIndex >= 0 && solIndex < sagIndex,
      oturumOzetiAltta: altIndex > sagIndex,
      // Teslim edilen 12 çift özet satırında toplanmalı.
      toplamYazili: /12 çift · 1 parça/.test(metin),
    };
  });
  // 5) PARÇA KENDİ KODUYLA SONRAKİ PROSESE GEÇER.
  //
  // Kullanıcı: "bölünen parça yoluna -1 eki almış olarak devam edecek, sanki ayrı üretimmiş gibi."
  // Kesim'de teslim edilen "2001-1" bohçası Saya'da yine "2001-1" olarak alınmalı — yeni kod
  // doğmamalı, ana koda da dönmemeli.
  await okut("2001-1");
  const sayaAtamasi = (((await depoOku(sayfa, "uretim:siparisler")) || [])[0].prosesIlerleme[1].atamalar || [])[0] || {};

  // 6) BÖLÜNDÜKTEN SONRA YENİ ADIMDA ANA KOD KAPALI.
  //
  // Bildirilen hata: 104 çift Saya'da 64 + 40 bölündü, Kalfa'da yine 104 olarak geldi. Ana kod
  // YENİ bir adımda okutulunca iki parça tek işmiş gibi birleşiyordu.
  //
  // NOT: bölünen adımın KALANI için ana kod hâlâ geçerli (o 40 çiftin henüz etiketi yok);
  // yukarıdaki 4. adımda tam olarak bu kullanıldı. Kapalı olan, ATAMASI HİÇ OLMAYAN yeni adım.
  // Buradaki ölçüm o mesajın kurulduğunu doğruluyor; kuralın kendisi birim testinde
  // (uretimBolunmusMu / uretimParcaKodlari) satır satır sınanıyor.
  const parcaKodlariMesajda = await sayfa.evaluate(() => /2001-1/.test(document.body.innerText));

  const sonUretim = ((await depoOku(sayfa, "uretim:siparisler")) || [])[0];
  const atamalar = sonUretim.prosesIlerleme[0].atamalar || [];

  await tarayici.close();
  return {
    hatalar,
    girisSonrasi,
    kismiAlma,
    ilkParcaBarkodu: ilkAtama.barkod,
    ilkParcaMiktari: ilkAtama.miktar,
    teslimSonrasi,
    teslimEdildiMi: !!teslimSonrasiAtama.tamamlandiMi,
    kalaniAlma,
    yerlesim,
    parcaKodlariMesajda,
    // Tek kart açık kalıyor: ikinci kart açılınca sayı 1'de kalmalı, 2'ye çıkmamalı.
    akordeon: { birinciAcik, ikinciAcik },
    uretimEtiketi,
    isEmri,
    // Parça sonraki proseste AYNI kodu taşımalı ve yalnızca kendi miktarını götürmeli.
    sayaKodu: sayaAtamasi.barkod,
    sayaMiktari: sayaAtamasi.miktar,
    // İki ayrı parça, kodları ana koddan türemiş olmalı: 2001-1, 2001-2
    parcaBarkodlari: atamalar.map((a) => a.barkod),
    parcaMiktarlari: atamalar.map((a) => a.miktar),
    // İkinci parça hâlâ elde olduğu için adım KAPANMAMALI.
    adimTamamlandiMi: !!sonUretim.prosesIlerleme[0].tamamlandiMi,
    // Parça barkodu ana koddan türemeli: "2001-1"
    kismiAlma,
    // İki ayrı parça oluşmalı ve kodları ana koddan türemeli: 2001-1, 2001-2
    parcaBarkodlari: atamalar.map((a) => a.barkod),
    parcaMiktarlari: atamalar.map((a) => a.miktar),
    teslimSonrasi,
    // İkinci parça hâlâ elde olduğu için adım KAPANMAMALI.
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
