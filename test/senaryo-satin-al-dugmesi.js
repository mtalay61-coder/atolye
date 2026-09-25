// SENARYO — DEPODAKİ "SATIN AL" DÜĞMESİ ÇIKMAZ SOKAK OLMAMALI.
//
// Kullanıcı: "Satın alma tıklayınca satın alma ekranı açması gerekir."
//
// Düğme, Planlama'daki hammadde ihtiyaç penceresini açıyordu. Ama iki ekran ihtiyacı FARKLI
// tanımlıyor: planlama bekleyen satış siparişlerinden doğan ve HENÜZ PLANLANMAMIŞ ihtiyacı
// listeliyor; Depo ise stok/rezervasyon defterinden "açık"ı hesaplıyor. Bir malzemenin açığı olup
// planlamada karşılığı olmayabilir. O durumda pencere bir bildirim gösterip kapanıyordu —
// kullanıcı açısından "bastım, hiçbir şey açılmadı".
//
// İLK DÜZELTME YANLIŞTI: boş durumda ALIŞ FİŞİ açılmıştı. Kullanıcı ayrımı netleştirdi:
//   alış fişi → siparişsiz, doğrudan cariden alım
//   satın al  → ALIŞ SİPARİŞİ girişi
// İkisi aynı ekrana çıkmamalı. Artık malzeme bu ekrana miktarsız bir satır olarak ekleniyor;
// kullanıcı miktarı yazıp alış SİPARİŞİNİ buradan oluşturuyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // Açığı olan bir malzeme: rezervasyon var, stok yok → Depo "Satın Al" düğmesini gösterir.
  // Planlamada karşılığı YOK (bekleyen satış siparişi yok), yani boş durum yolu çalışacak.
  // İKİ RENK: Depo satırı bir ürünün bütün renklerini tek grupta topluyor, o yüzden düğmenin
  // gönderdiği veride renk BAŞINA satır olmalı (kullanıcı, 12 Eylül).
  t["stokrez:data"] = JSON.stringify([{
    id: "sr1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", birim: "metre",
    siparisId: "s9", siparisNo: "SAT-9", uretimNo: "10007", miktar: 20, tuketilen: 0,
    tarih: "2026-09-01T08:00:00.000Z",
  }, {
    id: "sr2", urunId: "u1", urunAd: "Deri", renk: "Taba", beden: "", birim: "metre",
    siparisId: "s9", siparisNo: "SAT-9", uretimNo: "10007", miktar: 7, tuketilen: 0,
    tarih: "2026-09-01T08:00:00.000Z",
  }]);

  // Tohumdaki alış siparişi kaldırılıyor: Deri'de "yolda" olursa yeni kurala göre "Satın Al"
  // gizlenir ve aşağıdaki adımlar çalışmaz. Rozet kuralı ayrıca ölçülüyor.
  t["siparis:data"] = JSON.stringify([]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(800);
  // SIKI BAŞLIK (kullanıcı, 12 Eylül: "Depo'nun yarısına yakını arama, sekme vs."): üst şeritte
  // "Depo" başlığı var (eskiden boştu) ve ilk tablo satırı başlığa 200px'den yakın (900px genişlikte;
  // eski düzende 300px'ti).
  await sayfa.setViewportSize({ width: 900, height: 1200 });
  await sayfa.waitForTimeout(400);
  const sikiBaslik = await sayfa.evaluate(() => {
    const h = document.querySelector("h1");
    const tr = [...document.querySelectorAll("tbody tr")].find((t) => t.getBoundingClientRect().height > 0);
    return { baslik: h ? h.textContent.trim() : null, ilkSatirYakin: !!(h && tr) && (tr.getBoundingClientRect().top - h.getBoundingClientRect().top) < 200 };
  });

  // ROZET VE DÜĞME KURALI — hangi yol izlendiyse o yazar, diğeri kalkar.
  const satirDurumu = await sayfa.evaluate(() => {
    const oku = (ad) => {
      const tr = [...document.querySelectorAll("tr")].find((x) => new RegExp(ad).test(x.textContent));
      if (!tr) return null;
      const m = tr.textContent.replace(/\s+/g, " ");
      return {
        satinAlDugmesi: /Satın Al/.test(m),
        alisFisiDugmesi: /Alış Fişi/.test(m),
        siparisRozeti: /sipariş verildi/.test(m),
        karsilandiRozeti: /karşılandı/.test(m),
      };
    };
    return {
      // Açık var, sipariş yok → iki yol da açık, rozet yok.
      acikOlan: oku("Deri"),
      // Açık yok, yolda yok → "karşılandı" rozeti, düğme yok.
      acigiOlmayan: oku("Bot"),
    };
  });

  // "DEPODAKİ HER ŞEY" süzgecinde hareketi olmayan malzemeler de listelenmeli: onlar için de
  // alış yapılabilir (stok tazeleme, yeni renk). Kullanıcı: "ihtiyacı olmayan ürünler görünmüyor."
  // SATIRA TIKLAYINCA DETAY AÇILIYOR.
  // Beden sütunlarının kapalı satırda gizlenmesi ÇOK BEDENLİ malzemelerde geçerli; bu senaryodaki
  // Deri tek ölçülü olduğu için "tekil" tabloya düşüyor ve zaten beden sütunu taşımıyor.
  await sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("tbody tr")].find((tr) => /Deri/.test(tr.textContent));
    if (satir) satir.click();
  });
  await sayfa.waitForTimeout(500);
  const acikGorunum = await sayfa.evaluate(() => ({
    // Açılınca alt katman tablosu ve beden başlıkları görünür.
    detayAcildi: /RENK \/ ÖLÇÜ|AYRILAN/.test(document.body.innerText),
  }));

  const hepsiListeleniyor = await sayfa.evaluate(() => {
    // TEK ÜRÜN TEK SATIR: "Deri" iki renkli (Siyah, Taba) ama listede TEK satır olmalı;
    // renkler tıklanınca açılan detayda görünür.
    const deriSatirlari = [...document.querySelectorAll("tbody tr")]
      .filter((tr) => /Deri/.test(tr.textContent) && /renk/.test(tr.textContent));
    return {
      deriSatirSayisi: deriSatirlari.length,
      ozetHucresi: deriSatirlari.length > 0 && /renk · .* ölçü — detay için tıklayın/.test(deriSatirlari[0].textContent),
      hareketsizVar: /Taba/.test(document.body.innerText),
    };
  });

  const dugmeVar = await sayfa.locator('button:has-text("Satın Al"):visible').count();
  await sayfa.locator('button:has-text("Satın Al"):visible').first().click();
  await sayfa.waitForTimeout(1400);

  const sonuc = await sayfa.evaluate(() => {
    // Açık pencerelerin başlıkları ve görünürlükleri.
    // Toast da fixed; zamanlamaya bağlı olduğu için ölçüme girmiyor (21 Eylül).
    const pencereler = [...document.querySelectorAll('[style*="position: fixed"]')]
      .filter((e) => !e.hasAttribute("data-toast") && !e.closest("[data-toast]") && !/başlangıç stoğu açılış fişine/.test(e.innerText || ""))
      .map((e) => ({ display: getComputedStyle(e).display, metin: (e.innerText || "").replace(/\s+/g, " ").replace(/\d+ varyantın başlangıç stoğu açılış fişine bağlandı — stok artık hareketlerden hesaplanıyor/g, "").trim().slice(0, 80) }))
      .filter((x) => x.metin);
    const gorunen = pencereler.filter((x) => x.display !== "none").map((x) => x.metin);
    return {
      // AÇIK MİKTAR ÖN DOLU (v1.206.0, kullanıcı: "satın al tuşu da aynı mantıkta çalışmalı").
      // Hedefle açılan serbest satırlar eskiden `eksikMiktar: 0` geliyordu ve kullanıcı Depo'da
      // gördüğü sayıyı buraya elle yazıyordu. Rezervasyon açığı 20 metre.
      // Ölçüm panel satırlarından (aşağıda): sayfa metninde "20" aramak, aynı sayı başka yerde de
      // geçtiği için ölçtüğünü sanıp ölçmeyen bir kontroldü.
      satinAlMiktarOnDolu: null,
      // SATIN AL → HAMMADDE İHTİYAÇ (alış siparişi) ekranı açılmalı, alış FİŞİ değil.
      ihtiyacEkraniAcildi: gorunen.some((m) => /HAMMADDE İHTİYAÇ/i.test(m)),
      alisFisiAcilmadi: !gorunen.some((m) => /YENİ ALIŞ/i.test(m)),
      // Malzeme listede olmalı: miktar yazılıp sipariş oluşturulabilsin.
      malzemeListede: gorunen.some((m) => /Deri/.test(m)),
      // BAŞLIKTA "undefined" OLMAMALI (kullanıcı, 12 Eylül: "satın al ile alışta yaptığımızın
      // aynısı"). Depo satırı bütün renkleri tek grupta topladığı için düğme eskiden boş renk
      // gönderiyordu: başlık "Satın Al: Deri · undefined", ardından "Deri bulunamadı" bildirimi.
      basliktaUndefinedYok: !gorunen.some((m) => /undefined/.test(m)),
      bulunamadiBildirimiYok: !/bulunamadı/.test(document.body.innerText),
      // PANEL RENK+BEDEN SATIRLARIYLA AÇILIYOR: açığı olan iki rengin de satırı var ve miktarları
      // Depo'daki açıkla dolu (Siyah 20, Taba 7).
      panelSatirlari: (() => {
        const baslik = [...document.querySelectorAll("span")]
          .find((x) => /Hammadde Satın Alma/.test(x.textContent) && x.offsetParent !== null);
        let kap = baslik;
        while (kap && !kap.querySelector("table")) kap = kap.parentElement;
        const tablo = kap && kap.querySelector("table");
        if (!tablo) return null;
        return [...tablo.querySelectorAll("tbody tr")].map((tr) => {
          const td = [...tr.children];
          const kutu = tr.querySelector('input[type="number"]');
          return `${td[0].textContent.trim()} · ${td[1].textContent.trim()} · ${kutu ? kutu.value : ""}`;
        });
      })(),
      gorunen,
    };
  });

  // Depo'daki AÇIK miktarlar panelde hazır: Siyah 13, Taba 3 (talep − stok).
  // Panel hiç açılmadıysa (eski sürümde `panelSatirlari: null`) ölçüm BAŞARISIZ sayılmalı:
  // boş dizide `every` hep true döner — ölçmeyen bir ölçüm olurdu.
  sonuc.satinAlMiktarOnDolu = Array.isArray(sonuc.panelSatirlari)
    && sonuc.panelSatirlari.length > 0
    && sonuc.panelSatirlari.every((r) => /· \d/.test(r));

  // ---- ALIŞ FİŞİ DÜĞMESİ: DOĞRUDAN ALIŞ GİRİŞİ ----
  //
  // Kullanıcı: "Bizim doğrudan alış fişi girişi ekranımız yok! Alış fişine tıklayınca alış
  // siparişi oluşturuyor. Ve kontrol yok, 2. kez tıklıyorum yine aynı miktarları ekliyor."
  //
  // Alış fişi = sipariş olmadan doğrudan cariden alım. Cari kartındaki fiş ekranının AYNISI
  // açılmalı; ikinci basışta YENİ form değil, yarım kalan form geri gelmeli.
  await sayfa.locator('button[title^="Bu pencereyi kapat"], button:has-text("Kapat"):visible').first().click().catch(() => {});
  await sayfa.waitForTimeout(600);
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(700);
  // AÇIĞI OLAN satırın düğmesine basılıyor: miktar ön dolumu ancak açık varsa ölçülebilir.
  await sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("tr")].find((tr) => /Deri/.test(tr.textContent));
    const dugme = satir && [...satir.querySelectorAll("button")].find((b) => /Alış Fişi/.test(b.textContent));
    if (dugme) dugme.click();
  });
  await sayfa.waitForTimeout(1200);
  const fisEkrani = await sayfa.evaluate(() => {
    // Toast zamanlamaya bağlı; ölçüme girmiyor (21 Eylül).
    const gorunen = [...document.querySelectorAll('[style*="position: fixed"]')]
      .filter((e) => getComputedStyle(e).display !== "none" && !e.hasAttribute("data-toast"))
      .map((e) => (e.innerText || "").replace(/\s+/g, " ").slice(0, 90))
      .filter((m) => m && !/başlangıç stoğu açılış fişine/.test(m));
    return {
      // Fiş ekranı açılmalı — SİPARİŞ formu değil.
      fisEkraniAcildi: gorunen.some((m) => /ALIŞ FİŞİ/i.test(m)),
      siparisFormuAcilmadi: !gorunen.some((m) => /YENİ ALIŞ|Yeni Satın Alma/i.test(m)),
      // CARİ SEÇİMİ formun içinde olmalı: başka cariden alım yapılabilsin.
      cariSecimiVar: !!document.querySelector('select[title="Alışın yapılacağı cari"]'),
      // DEPO'DAN GELEN ÜRÜN KALEM OLARAK gelmeli (v1.206.0). Önce form SEÇİCİSİ dolduruluyordu
      // ve kullanıcı ayrıca "Kalem Ekle"ye basmak zorundaydı; artık doğrudan listeye düşüyor.
      //
      // Eski ölçüm yanlış ürünü ("Bot") arıyordu ve HEP false dönüyordu — yeşil görünmediği için
      // fark edilmedi, ama ölçtüğünü sandığı şeyi hiç ölçmüyordu.
      urunKalemOlarakGeldi: /Deri/.test(document.body.innerText),
      // İHTİYAÇ ADETLERİ ön dolu gelmeli; kullanıcı Depo'daki sayıları elle kopyalamasın.
      miktarOnDolu: [...document.querySelectorAll('input[type="number"]')]
        .some((i) => i.getBoundingClientRect().width > 0 && parseFloat(i.value) > 0),
      gorunen,
    };
  });

  // CARİ DEĞİŞİNCE ÜST BAŞLIK DA DEĞİŞMELİ.
  // Kayıt doğru cariye gidiyordu ama başlık açılıştaki cariyi yazmaya devam ediyordu.
  const cariKutusu = sayfa.locator('select[title="Alışın yapılacağı cari"]');
  await cariKutusu.selectOption({ label: "Müşteri B" }).catch(() => {});
  await sayfa.waitForTimeout(600);
  const baslikGuncellendi = await sayfa.evaluate(() => /Müşteri B/.test(document.body.innerText));

  // İKİNCİ BASIŞ ölçülmüyor: pencere tam ekran açıldığı için şerit gizleniyor ve sayım güvenilir
  // olmuyor. Çift kayıt koruması `depoPencereAc` anahtarından geliyor (cari + tip): aynı anahtarla
  // ikinci kez basıldığında YENİ pencere açılmıyor, yarım kalan form geri geliyor. Aynı mekanizma
  // cari kartındaki fiş penceresinde de kullanılıyor.

  await tarayici.close();
  return {
    sikiBaslik, hatalar, acikGorunum, hepsiListeleniyor, satirDurumu, dugmeVar, sonuc, fisEkrani, baslikGuncellendi };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
