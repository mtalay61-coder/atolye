// SENARYO — SEKME KURALI.
//
// Kullanıcı (6 Eylül): "Soldaki pencereden açılan her sayfa açık kalsın, bir sonraki sayfa onu
// ezmesin, üstte açık sekmeler olsun. Bu bundan sonra NET KURAL olsun. Bir ekrandan bir yere geçiş
// var ise, geçiş yapılan ekran kapatılınca önceki ekrana geri dönsün."
//
// Kural olduğu için testi de var: ileride bir ekran eklendiğinde sekme şeridine girmezse ya da
// kapatma önceki sayfaya dönmezse burada kırılsın.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Şerit: sayfanın en üstündeki çubuk. Açılışta yalnız Anasayfa var.
  // `fixed` (v1.180.0): kullanıcı (7 Eylül) "sol menü ve üst sekmeler HİÇ KAYBOLMASIN" dedi.
  // Bir gün önce tersi denenmişti; şerit kayınca ekranda hiçbir gezinme aracı kalmadığı görüldü.
  const seritMetni = () => sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("div")]
      .filter((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent))[0];
    return s ? s.innerText.split("\n").map((x) => x.trim()).filter(Boolean) : [];
  });

  // KAYDIRMA DAVRANIŞI: şerit de sol menü de kaydırma boyunca EKRANDA KALIYOR.
  const seritUstu = () => sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("div")]
      .filter((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent))[0];
    return s ? Math.round(s.getBoundingClientRect().top) : null;
  });

  const acilis = await seritMetni();

  // Üst menü (v1.449.0): modül düğmeleri açılır listede, `modulAc` ile doğrudan.
  const menu = (ad) => ({ click: () => modulAc(sayfa, ad) });
  await menu("Stok").click();
  await sayfa.waitForTimeout(400);
  await menu("Cari").click();
  await sayfa.waitForTimeout(400);
  await menu("Üretim").click();
  await sayfa.waitForTimeout(400);

  // ÜÇ SAYFA DA AÇIK KALMALI — biri diğerini ezmemeli.
  const ucSayfa = await seritMetni();

  // AYNI SAYFAYA TEKRAR GİTMEK İKİNCİ SEKME AÇMAMALI.
  await menu("Stok").click();
  await sayfa.waitForTimeout(400);
  const tekrarSonrasi = await seritMetni();

  // KAPATINCA ÖNCEKİNE DÖN. Şu an Stok'tayız; geçmiş: Cari → Üretim → Stok.
  // Stok kapatılınca en son bulunulan AÇIK sayfaya, yani Üretim'e dönmeli.
  const stokSekmesiniKapat = await sayfa.evaluate(() => {
    const serit = [...document.querySelectorAll("div")]
      .filter((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent))[0];
    if (!serit) return false;
    const sekme = [...serit.children].find((c) => c.textContent.trim().startsWith("Stok"));
    if (!sekme) return false;
    const kapat = sekme.querySelector("button");
    if (!kapat) return false;
    kapat.click();
    return true;
  });
  await sayfa.waitForTimeout(600);
  const kapatmaSonrasi = await seritMetni();
  // Hangi sayfadayız: modül başlığından anlaşılıyor.
  // Hangi sayfada olduğumuzu ŞERİTTEKİ AKTİF SEKME söylüyor — modül başlıkları birbirine
  // benziyor ve metne bakmak kırılgan olurdu. Aktif sekmenin zemini açık renk.
  const donulenEkran = await sayfa.evaluate(() => {
    const serit = [...document.querySelectorAll("div")]
      .filter((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent))[0];
    const aktif = [...serit.children].find((c) => c.style && getComputedStyle(c).backgroundColor === "rgb(251, 246, 236)");
    return { aktifSekme: aktif ? aktif.textContent.trim() : "(yok)" };
  });

  // ANASAYFA KAPATILAMAZ: dönülecek bir yer hep kalmalı.
  const anasayfaKapatmaDugmesi = await sayfa.evaluate(() => {
    const serit = [...document.querySelectorAll("div")]
      .filter((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent))[0];
    const sekme = [...serit.children].find((c) => c.textContent.trim().startsWith("Anasayfa"));
    return sekme ? !!sekme.querySelector("button") : null;
  });

  // SOL MENÜ EKRANDA KALMALI (kullanıcı bildirdi, 6 Eylül: "sol sekme barı kayıp").
  // Şerit kaydırılabilir olunca (7z-19) menü de kaybolursa ekranda HİÇBİR gezinme aracı kalmıyor.
  const menuKonumu = async () => sayfa.evaluate(() => {
    const n = document.querySelector(".ust-menu");
    if (!n) return null;
    const ikon = n.querySelector('[data-nav-grup="Depo"]');   // üst menü: Stok açılır listede, grup düğmesi ölçülüyor
    return ikon ? Math.round(ikon.getBoundingClientRect().top) : null;
  });
  const menuBasta = await menuKonumu();

  // AÇIK MOR PALET (kullanıcı, 7 Eylül: "sol ve üst menüyü açık mor renginde yap").
  //
  // Zemin açılınca metin de koyulaşmak ZORUNDA: eski krem (#F2E8D8) bu zeminde okunmuyordu.
  // Ölçüm ikisini birden alıyor, yoksa "rengi değişti ama yazısı kayboldu" durumu gözden kaçar.
  // MOBİL ALT ÇUBUK DA AYNI PALETTE. Palet değişikliğinde seçili ögenin ZEMİNİ atlanmıştı: koyu
  // kahve kutu açık mor çubuğun içinde kalıyor, üzerindeki mor yazı okunmuyordu (kullanıcı ekran
  // görüntüsüyle bildirdi, 7 Eylül). Dar ekrana geçip ölçülüyor.
  const eskiGorunumMobil = sayfa.viewportSize();
  await sayfa.setViewportSize({ width: 420, height: 800 });
  await sayfa.waitForTimeout(500);
  // Alt çubuk artık kullanıcının seçtiği İLK DÖRT modülü gösteriyor (14 Eylül, Mobil Görünüm);
  // aktif sekmeyi ölçebilmek için önce çubuktaki bir sekmeye geçiliyor.
  await sayfa.evaluate(() => { const b = document.querySelector(".mobile-tabs button:nth-child(2)"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const mobilCubuk = await sayfa.evaluate(() => {
    const nav = document.querySelector(".mobile-tabs");
    if (!nav) return null;
    const aktif = [...nav.querySelectorAll("button")]
      .find((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)");
    const yazi = aktif ? aktif.querySelector("span") : null;
    return {
      zemin: getComputedStyle(nav).backgroundColor,
      aktifZemin: aktif ? getComputedStyle(aktif).backgroundColor : null,
      aktifYazi: yazi ? getComputedStyle(yazi).color : null,
    };
  });
  // Geniş ekrana KESİN dönüş: `viewportSize()` null dönerse dar ekranda kalınıyor ve sonraki
  // ölçümler (sol menü, modül başlığı) boş çıkıyordu.
  await sayfa.setViewportSize(eskiGorunumMobil || { width: 1280, height: 900 });
  await sayfa.waitForTimeout(400);

  // ANASAYFA KARŞILAMA BANDI — mor ve KÜÇÜK (kullanıcı, 7 Eylül: "logonun arka planını da
  // değiştir, mor ile uyumlu olsun; çok yer kaplıyor, onu da ufalt, ekranı kullanacağız").
  // Yükseklik ölçülüyor çünkü asıl şikâyet renk değil YER: bant ekranın üçte birini kaplıyordu.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Anasayfa");
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const karsilamaBandi = await sayfa.evaluate(() => {
    const h1 = document.querySelector("h1");
    if (!h1) return null;
    let bant = h1;
    while (bant && getComputedStyle(bant).backgroundColor === "rgba(0, 0, 0, 0)") bant = bant.parentElement;
    return {
      zemin: bant ? getComputedStyle(bant).backgroundColor : null,
      yukseklik: bant ? Math.round(bant.getBoundingClientRect().height) : null,
      baslikBoyutu: getComputedStyle(h1).fontSize,
      // Açıklama cümlesi kaldırıldı: her gün açan kişiye ne işe yaradığını anlatmak gürültü.
      aciklamaKaldirildi: !/tek yerden yönetin/.test(document.body.innerText),
    };
  });

  // MODÜL BAŞLIĞI KÜÇÜK, KUR MENÜDE (kullanıcı, 7 Eylül: "başlıklar bilgiden fazla yer kaplıyor,
  // kur sol menü en alta al, başlığı küçült").
  //
  // Ölçülen şey BOYUT değil KONUM: asıl kazanç, ilk gerçek içeriğin (arama kutusu) ne kadar
  // yukarı çıktığı. Yalnız punto ölçseydik "küçüldü ama hâlâ aşağıda" durumu kaçardı.
  // Menü daraltılmışken düğmenin metni görünmüyor (yalnız ikon + title); `data-nav` her iki
  // durumda da var — 14 Eylül'de NavItem'e eklendi.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const modulBasligi = await sayfa.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].find((x) => /Stok Yönetimi/.test(x.textContent));
    const menu = document.querySelector(".ust-menu");
    const arama = [...document.querySelectorAll("input")].find((i) => /^Ara: ürün/.test(i.placeholder || ""));
    return {
      baslikBoyutu: h1 ? getComputedStyle(h1).fontSize : null,
      // Kur rozeti menüde: modüle ait bir bilgi değil, uygulamanın geneline ait.
      kurMenude: menu ? /\$|₺/.test(menu.textContent) : false,
      // Açıklama cümlesi kaldırıldı; ne olduğu başlıkta zaten yazılı.
      aciklamaKaldirildi: !/ürün matrisi oluşturun/.test(document.body.innerText),
      ilkIcerikUstu: arama ? Math.round(arama.getBoundingClientRect().top) : null,
    };
  });

  // KUR ROZETİ ÜST ŞERİDİN SAĞ UCUNDA (kullanıcı, 7 Eylül: "bunu sağ üst bara alalım en iyisi").
  //
  // Önce sol menünün altındaydı; menü daraltılınca 64 piksele sıkışıp iki satıra kırılıyordu ve
  // menü dibi ekranın en az bakılan köşesi. Şerit hem her ekranda görünür hem yatay.
  const kurRozeti = await sayfa.evaluate(() => {
    const serit = [...document.querySelectorAll("div")]
      .find((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent));
    if (!serit) return null;
    const kutu = [...serit.querySelectorAll("div")]
      .find((d) => /\$|€/.test(d.textContent) && d.getBoundingClientRect().height > 0);
    const menu = document.querySelector(".ust-menu");
    const sr = serit.getBoundingClientRect();
    return {
      seritte: !!kutu,
      // Şerit 40 piksel; rozet ona sığmalı, yoksa şeridi büyütür ya da taşar.
      seridiTasmiyor: kutu ? kutu.getBoundingClientRect().height <= sr.height : false,
      // SAĞ UÇTA: sekmeler soldan doldukça rozet yerinde kalmalı.
      sagUcaYakin: kutu ? Math.round(sr.right - kutu.getBoundingClientRect().right) < 20 : false,
      // Menüden kaldırıldı: iki yerde birden durması "hangisi güncel" sorusu doğururdu.
      menudenKaldirildi: menu ? !/\$|€/.test(menu.textContent) : null,
    };
  });

  // KUR PANELİ AÇILINCA GÖRÜNMELİ (kullanıcı, 7 Eylül: "elle kur girme altta kalıyor görünmüyor").
  //
  // Rozet şeride taşınırken dış kaba `overflow: hidden` konmuştu; panel şeridin İÇİNDE `absolute`
  // konumlu olduğu için kırpılıyordu — açılıyor ama görünmüyordu. Panelin `zIndex`i de şeridinkinden
  // düşüktü (400 < 500), yani sayfanın kendi ögelerinin altında kalıyordu.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Kuru elle gir/.test(x.title || ""));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const kurPaneli = await sayfa.evaluate(() => {
    const p = [...document.querySelectorAll("div")]
      .find((d) => d.style && d.style.position === "absolute" && /Kur geçmişi|USD/.test(d.textContent));
    if (!p) return { acildi: false };
    const r = p.getBoundingClientRect();
    return {
      acildi: true,
      // Kırpılmıyor: yüksekliği var ve ekranın içinde.
      gorunur: r.height > 0 && r.bottom > 0,
    };
  });
  // Paneli kapat: sonraki ölçümlerin önünü kapatmasın.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Kuru elle gir/.test(x.title || ""));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(400);

  const palet = await sayfa.evaluate(() => {
    const menu = document.querySelector(".ust-menu");
    const serit = [...document.querySelectorAll("div")]
      .find((d) => d.style && d.style.position === "fixed" && /ust-menu-h/.test(d.style.top)
        && /Anasayfa/.test(d.textContent));
    return {
      menuZemin: getComputedStyle(menu).backgroundColor,
      menuMetin: getComputedStyle(menu).color,
      seritZemin: serit ? getComputedStyle(serit).backgroundColor : null,
    };
  });

  const seritBasta = await seritUstu();
  await sayfa.evaluate(() => window.scrollTo(0, 400));
  await sayfa.waitForTimeout(400);
  const seritKaydirinca = await seritUstu();
  const menuKaydirinca = await menuKonumu();
  await sayfa.evaluate(() => window.scrollTo(0, 0));

  await tarayici.close();
  return {
    hatalar,
    acilis,
    ucSayfa,
    tekrarSonrasi,
    stokSekmesiniKapat,
    kapatmaSonrasi,
    donulenEkran,
    anasayfaKapatmaDugmesi,
    // Başta 0, kaydırınca NEGATİF: şerit yukarıda kaldı, yapışmadı.
    palet,
    kurPaneli,
    kurRozeti,
    modulBasligi,
    karsilamaBandi,
    mobilCubuk,
    // ÜST MENÜ (v1.449.0): yan menü kalktı. Menü en üstte, şerit onun ALTINDA; ikisi de sabit.
    // Kullanıcının 6-7 Eylül kuralı aynen ölçülüyor: kaydırınca hiçbir gezinme aracı kaybolmaz.
    kaydirma: {
      basta: seritBasta,
      // Şerit sabit: kaydırınca yeri değişmiyor.
      seritSabitKaldi: seritKaydirinca === seritBasta,
      // Menü kaydırmadan sonra da ekranda VE şeridin üstünde (ona binmiyor).
      menuEkrandaKaldi: menuKaydirinca !== null && menuKaydirinca >= 0 && menuKaydirinca < seritBasta,
      menuSabitKaldi: menuKaydirinca === menuBasta,
    },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
