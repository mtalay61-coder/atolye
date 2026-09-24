// =============================================================================================
// FİŞSİZ HAREKET OLMAZ
//
// KURAL: stok ya da cari, elle ya da sistem tarafından — her hareketin bir fiş numarası vardır.
// İstisnasız.
//
// GEREKÇE: fiş numarası bir hareketin NEREDEN GELDİĞİNİ anlatan tek alandır. Fişsiz hareket,
// aylar sonra "bu 14 metre nereden çıktı" sorusunun cevapsız kalması demektir; Fişler sekmesi
// tam olarak bu soruyu cevaplamak için var. Sistemin kendi ürettiği hareket de fişsiz kalmaz —
// aksine, kullanıcının hatırlamadığı hareket asıl onun ürettiğidir.
//
// Numara okunabilir ve konuşurken kullanılabilir olmalı: ön ek kaynağı, tarih ne zaman olduğunu,
// son blok da aynı gün içindeki kayıtları birbirinden ayırır.
//     MH-20260830-K3F7   muhasebe (kasa/banka) kaynaklı
//     EL-20260830-A91C   elle girilen cari hareketi
//     1004-Kesim         üretim (sipariş numarası + proses)
//     ACILIS-2026-08-30  açılış / defter düzeltmesi
let _fisSayac = 0;

// İŞLEM TİPİNDEN FİŞ ÖN EKİ.
// Numaranın ilk bakışta ne olduğunu söylemesi için: THS-… tahsilat, ODM-… ödeme, AF/SF alış/satış.
// Eskiden elle girilen her hareket "EL-" alıyordu ve tahsilat ile ödeme numaradan ayırt edilemiyordu.
const FIS_ON_EKI = { "Alış": "AF", "Satış": "SF", "Ödeme": "ODM", "Tahsilat": "THS" };
function fisOnEki(tip) {
  return FIS_ON_EKI[tip] || "EL";
}

// SIRA NUMARALI FİŞ NO — "THS-20260902-001", "THS-20260902-002"…
//
// `fisNoUret` rastgele bir son blok kullanıyor ("EL-20260902-02ZQYK"): çakışmayı imkânsıza yakın
// kılıyor ama insan için okunaksız ve "kaçıncı tahsilat" bilgisini taşımıyor. Muhasebede numaranın
// SIRALI olması bekleniyor.
//
// TAKAS AÇIK OLSUN: sıra numarası mevcut kayıtlardan hesaplanıyor. İki kullanıcı AYNI GÜN,
// AYNI TİPTE, birbirinden habersiz (çevrimdışı) kayıt girerse ikisi de aynı sırayı bulabilir.
// Rastgele blok bunu seyrekleştiriyordu, sıra numarası bu güvenceyi bırakıyor. Karşılığında
// numara okunur ve sayılabilir oluyor — kullanıcının istediği bu.
// Yine de aynı cihazda çakışma İMKÂNSIZ: üretilen numara mevcutlarda varsa bir sonrakine geçiliyor.
// FİŞ NUMARASI BİÇİMİ (kullanıcı, 17 Eylül: "AF-20260917-002 çok uzun, onu 0917002 olarak
// güncelleyelim ve bu mantık her fişte aynı olsun").
//
// Eski: `AF-20260917-002` → 17 karakter, telefonda satırı taşıyor ve okunması zor.
// Yeni: `AF-0917002` → ay+gün (4) + sıra (3). Yıl atıldı: fişin yılı zaten tarihinden belli ve
// atölye numarayı gün içinde konuşuyor ("bugünün 002'si"). Ön ek işin cinsini söylüyor.
//
// ÇAKIŞMA: yıl atıldığı için aynı ay-gün gelecek yıl tekrar eder. Sıra hesabı MEVCUT NUMARALARA
// bakıyor, o yüzden aynı gün içinde çakışma imkânsız; yıllar arası tekrar ise farklı tarihli iki
// fiş demek ve kayıtta tarih zaten var. Buna karşılık kısalık her gün işe yarıyor.
function fisGunKodu() {
  return bugunYerel().replace(/-/g, "").slice(4);   // 20260917 → 0917
}

function fisNoSiradaki(onEk, mevcutNumaralar) {
  const gun = fisGunKodu();
  const kok = `${onEk}-${gun}`;
  const kume = new Set((mevcutNumaralar || []).filter(Boolean).map(String));
  let enBuyuk = 0;
  kume.forEach((no) => {
    if (!no.startsWith(kok)) return;
    const son = no.slice(kok.length);
    if (/^\d+$/.test(son)) enBuyuk = Math.max(enBuyuk, parseInt(son, 10));
  });
  let sira = enBuyuk + 1;
  while (kume.has(kok + String(sira).padStart(3, "0"))) sira++;
  return kok + String(sira).padStart(3, "0");
}

// Bütün cari hareketlerindeki fiş numaraları — sıra hesabı için.
function tumFisNumaralari(cariler) {
  const cikan = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => { if (h.fisNo) cikan.push(h.fisNo); }));
  return cikan;
}

function fisNoUret(onEk) {
  const g = fisGunKodu();
  // İKİ PARÇALI SON BLOK — ikisi de gerekli:
  //   sayaç    aynı bilgisayarda üretilen iki numaranın çakışmasını İMKÂNSIZ kılar
  //   rastgele farklı bilgisayarların aynı sayaç değerine gelmesini seyrekleştirir
  // Yalnızca rastgele 4 karakterle 5000 üretimde 12 çakışma çıkıyordu; çakışan fiş numarası,
  // izlenebilirliğin kendisini bozar.
  const sayac = (_fisSayac = (_fisSayac + 1) % 1296).toString(36).padStart(2, "0").toUpperCase();
  const rastgele = Math.random().toString(36).slice(2, 6).toUpperCase();
  // Aynı biçim: ön ek + ay/gün + son blok (ODM-0917002 gibi sıralı numaraya benzesin diye
  // araya tire konmuyor).
  return `${onEk}-${g}${sayac}${rastgele}`;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// "1 yabancı para = X TRY" formatındaki bir kur haritası (Muhasebe'deki kurlar ile aynı format)
// kullanarak, bir tutarı kaynakPB'den hedefPB'ye çevirir. TL hiçbir zaman doğrudan kur haritasında
// tutulmaz (kur her zaman "1 X = ? TRY" yönünde saklanır) — bu yüzden TL'ye çevirirken çarpma,
// TL'den çevirirken bölme kullanılır. Gereken kur yoksa null döner (sessizce yanlış hesaplanmaz).
function paraCevirGenel(tutar, kaynakPB, hedefPB, kurlarMap) {
  if (kaynakPB === hedefPB) return tutar;
  if (hedefPB === "TRY") {
    const kur = (kurlarMap || {})[kaynakPB];
    return kur > 0 ? tutar * kur : null;
  }
  if (kaynakPB === "TRY") {
    const kur = (kurlarMap || {})[hedefPB];
    return kur > 0 ? tutar / kur : null;
  }
  const kurKaynak = (kurlarMap || {})[kaynakPB];
  const kurHedef = (kurlarMap || {})[hedefPB];
  return (kurKaynak > 0 && kurHedef > 0) ? (tutar * kurKaynak) / kurHedef : null;
}

// Kısmi tedarik planlaması, bir kalemi ikiye BÖLEBİLİR (bkz. planlaUretim/planlaSatinAlma) — örn.
// "37: 2 çift" kalemi, 1 çifti üretime 1 çifti satınalmaya gönderilince İKİ AYRI kaleme ayrılır. Bu
// planlamalardan biri (ya da ikisi) SONRADAN İPTAL EDİLİP (üretim/satınalma silinip) o kalemin
// `planlama` alanı null'a döndüğünde, bölünmüş parçalar OTOMATİK OLARAK TEKRAR BİRLEŞTİRİLMEZSE, aynı
// renk/beden için sonsuza kadar biriken "bekleyen" kalem parçaları oluşur. Bu fonksiyon, bir siparişin
// kalemler dizisinde, AYNI (urunId, renk, beden, birimFiyat, paraBirimi) kombinasyonuna sahip
// kalemleri birleştirir — İKİ FARKLI durumda:
// 1) İKİSİ DE hâlâ bekleyen (planlama=null) — her zaman güvenle birleştirilir.
// 2) İKİSİ DE AYNI planlamaya (aynı tip + aynı referansNo) bağlı — yine güvenle birleştirilir, çünkü
//    zaten aynı üretim/satınalma fişine ait, sadece gereksiz yere iki satıra bölünmüşler.
// FARKLI planlama referanslarına bağlı kalemler ASLA birleştirilmez — bunlar GERÇEKTEN ayrı tedarik
// kayıtlarını temsil eder, birleştirmek izlenebilirliği bozar.
function bekleyenKalemleriBirlestir(kalemler) {
  const sonuc = [];
  const index = {}; // birleştirme anahtarı -> sonuc dizisindeki indeks
  kalemler.forEach((k) => {
    const planlamaAnahtari = k.planlama ? `planli:${k.planlama.tip}:${k.planlama.referansNo}` : "bekleyen";
    const anahtar = `${k.urunId}|${k.renk}|${k.beden}|${k.birimFiyat}|${k.paraBirimi || "TRY"}|${planlamaAnahtari}`;
    if (anahtar in index) {
      const mevcut = sonuc[index[anahtar]];
      sonuc[index[anahtar]] = {
        ...mevcut,
        miktar: mevcut.miktar + k.miktar,
        karsilanan: (mevcut.karsilanan || 0) + (k.karsilanan || 0),
      };
    } else {
      index[anahtar] = sonuc.length;
      sonuc.push(k);
    }
  });
  return sonuc;
}

// FİŞE HAZIR GELEN KALEMLER — AYNI İHTİYAÇ BİR KEZ.
//
// Kullanıcı (11 Eylül): "İhtiyaç 880 çift Gold rengi ama alış fişinde fazla gösteriyor." Depo'dan
// alış fişi açılınca iki kaynak birleşiyor: TIKLANAN satır ve aynı tedarikçinin MRP eksikleri.
// Tıklanan satır MRP'de de var; ikisi aynı ihtiyaçtır, TOPLANMAZ.
//
// Anahtar ürün · renk · beden; İLK GELEN kalıyor. Çağıran tıklanan satırı başa koyuyor, yani
// kullanıcının bastığı satırın miktarı geçerli. (Fiyat/para birimi anahtara girmiyor: aynı
// ürün-renk-bedenin iki farklı fiyatla iki satır olması burada hep bir kopya demek.)
//
// `bekleyenKalemleriBirlestir`dan farkı: o bir siparişin GERÇEKTEN ayrı parçalarını MİKTARLARI
// TOPLAYARAK birleştiriyor; burada iki kaynak aynı şeyi söylüyor, toplamak ihtiyacı ikiye katlardı.
function fisKalemAnahtari(k) {
  // KOLİ SATIRI AYRI (23 Eylül, v1.423.0): aynı bedeni taşıyan iki koli KOPYA DEĞİLDİR. Anahtarda
  // koli yoktu; siparişten açılan fişte ikinci koli "kopya" sayılıp atılıyordu (senaryoda 2 koli → 1).
  return `${k.urunId}|${k.renk || ""}|${k.beden || ""}${k.koliId ? `|koli:${k.koliId}` : ""}`;
}
function hazirKalemleriTekille(kalemler) {
  const gorulen = new Set();
  return (kalemler || []).filter((k) => {
    const anahtar = fisKalemAnahtari(k);
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
}

// Hem window.print() hem window.open() (yeni sekme/pop-up) bazı kısıtlı ortamlarda (örn. bu uygulama
// bir iframe önizlemesi içinde çalışıyorsa) tarayıcı tarafından SESSİZCE ENGELLENEBİLİR — düğmeye
// tıklandığında hiçbir şey olmaz. Bunlara güvenmek yerine, yazdırılacak içeriği (verilen CSS seçiciyle
// bulunan elementin innerHTML'i) bağımsız bir HTML DOSYASI olarak İNDİRİYORUZ — dosya indirme, pop-up/
// print izinlerinden farklı, çok daha az kısıtlanan bir tarayıcı izni olduğu için neredeyse her ortamda
// çalışır. Kullanıcı indirilen dosyayı açıp, kendi tarayıcısından normal şekilde yazdırabilir/PDF'e
// kaydedebilir.
// ---- TERMİNAL (FİŞ) YAZICI ----
// Atölyedeki küçük termal yazıcı için dar fiş çıktısı. Normal yazdırmadan farkı:
//   · Sayfa genişliği 58/80 mm — masaüstü A4 düzeni burada okunamaz hale gelir
//   · Büyük punto ve kalın rakamlar — atölye ışığında, çoğu zaman ayakta okunur
//   · Süs yok: çerçeve, gölge, renk basılmaz; termal yazıcı zaten tek renktir
//
// Gizli bir iframe kullanılıyor: yeni sekme açmak (window.open) çoğu tarayıcıda engelleniyor ve
// personel "yazdır dedim bir şey olmadı" diyor. iframe aynı sayfada kalır, engellenmez.
// Yazdırma penceresi yine de çıkarsa kullanıcı onaylar; yazıcı varsayılan seçiliyse tek tık.
// ETİKET YAZDIRMA — barkod yazıcısı için.
//
// Fiş yazdırmadan AYRI: fiş rulo kâğıda sürekli akar, `size: 80mm auto` yeter. Etiket ise SABİT
// boyutlu ve yazıcı her etiketi ayrı besler. Bu yüzden:
//   - `@page` hem genişlik hem YÜKSEKLİK alıyor (6cm × 4cm gibi),
//   - her etiket kendi SAYFASINDA basılıyor: "koli 8 çiftse 8 sayfa".
// Tek sayfaya alt alta dizmek, barkod yazıcısında etiketlerin kayarak yarım basılmasına yol açar.
//
// Kenar boşluğu 0: etiket zaten tam boyutunda kesilmiş, ayrıca boşluk bırakmak içeriği kaydırıyor.
function etiketYazdir(etiketler, { genislikMM, yukseklikMM, ustHizali }) {
  const sayfalar = etiketler.map((icerik, i) => (
    // Son etikette sayfa sonu YOK: yazıcıya fazladan bir boş etiket besletirdi.
    `<div class="etiket"${i < etiketler.length - 1 ? ' style="page-break-after:always"' : ""}>${icerik}</div>`
  )).join("");

  const cerceve = document.createElement("iframe");
  cerceve.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(cerceve);
  const doc = cerceve.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>${erpTokenCss()}
      @page { size: ${genislikMM}mm ${yukseklikMM}mm; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Courier New', monospace; color: #000; }
      /* Küçük etiket ORTALANIR (içerik az, göz ortaya bakar). İŞ EMRİ gibi dolu sayfalar ise
         üstten hizalanır: ortalamak, uzun bir tabloyu sayfanın dışına taşırır. */
      .etiket {
        width: ${genislikMM}mm; height: ${yukseklikMM}mm;
        padding: ${ustHizali ? 6 : 2}mm; overflow: hidden;
        display: flex; flex-direction: column;
        align-items: ${ustHizali ? "stretch" : "center"};
        justify-content: ${ustHizali ? "flex-start" : "center"};
        text-align: ${ustHizali ? "left" : "center"};
      }
      /* Barkod etikete sığmalı: taşan bir barkod kesilir ve okunmaz. */
      .etiket svg { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
      td, th { font-size: 9px; padding: 0.3mm 0.5mm; }
    </style></head><body>${sayfalar}</body></html>`);
  doc.close();
  setTimeout(() => {
    try { cerceve.contentWindow.focus(); cerceve.contentWindow.print(); } catch (e) { /* engellenirse sessiz geç */ }
    setTimeout(() => { if (cerceve.parentNode) cerceve.parentNode.removeChild(cerceve); }, 1500);
  }, 250);
}

function fisYazdir(icerikHTML, genislikMM = 80) {
  const cerceve = document.createElement("iframe");
  cerceve.style.position = "fixed";
  cerceve.style.right = "0";
  cerceve.style.bottom = "0";
  cerceve.style.width = "0";
  cerceve.style.height = "0";
  cerceve.style.border = "0";
  document.body.appendChild(cerceve);
  const doc = cerceve.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>${erpTokenCss()}
      @page { size: ${genislikMM}mm auto; margin: 3mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; width: ${genislikMM - 6}mm; margin: 0; color: #000; }
      .baslik { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 2mm; }
      .satir { display: flex; justify-content: space-between; font-size: 12px; margin: 1mm 0; }
      .buyuk { font-size: 20px; font-weight: bold; }
      .cizgi { border-top: 1px dashed #000; margin: 2mm 0; }
      .orta { text-align: center; }
      table { width: 100%; border-collapse: collapse; }
      td { font-size: 13px; padding: 0.5mm 0; }
      .sag { text-align: right; }
    </style></head><body>${icerikHTML}</body></html>`);
  doc.close();
  // Yazdırmayı içerik yerleştikten sonra tetikle; hemen çağırmak boş sayfa bastırabiliyor.
  setTimeout(() => {
    try { cerceve.contentWindow.focus(); cerceve.contentWindow.print(); } catch (e) { /* engellenirse sessiz geç */ }
    setTimeout(() => { if (cerceve.parentNode) cerceve.parentNode.removeChild(cerceve); }, 1500);
  }, 250);
}

// Hazır HTML gövdesini yazdırılabilir dosya olarak indirir (dosya adı verildiği gibi;
// `indirYazdirilabilirHTML` DOM'dan okur, bu metinden). İkisi aynı sayfa kalıbını kullanıyor.
function htmlGovdesiniIndir(govdeHTML, dosyaAdi) {
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${dosyaAdi || "Yazdır"}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #33281C; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 8px; text-align: left; font-size: 12px; }
          img { max-width: 100%; }
          .mono { font-family: 'Courier New', monospace; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body onload="window.print()">${govdeHTML}</body>
    </html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(dosyaAdi || "yazdir").replace(/[^\w\-ğüşıöçĞÜŞİÖÇ .]/g, "")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---- SİPARİŞ ÇIKTISI + WHATSAPP (kullanıcı, 13 Eylül) ----------------------------------------
//
// "Sipariş tedarik planlamada yazdırma ve WhatsApp gönderimi olmalı; alış veya satış siparişini
//  çıktı almak ve cariye WhatsApp'tan göndermek için. Çıktıyı sipariş no ve cari adı ile
//  isimlendir; cari kartta WhatsApp no girişi yapalım, oradaki numaraya otomatik göndersin."
//
// Çıktı: firma başlığı, sipariş no/tarih/teslim, cari, kalemler MATRİS (ürün+renk satır, beden
// sütun), fiyat/tutar, toplam, not. Dosya adı "SAT-1002 - Serdar Özemen.html" (yazdırma penceresi
// kendiliğinden açılır, PDF olarak kaydedilebilir).
//
// WhatsApp: tarayıcıdan bir numaraya dosya GÖNDERİLEMEZ (WhatsApp'ın kendi ekranı açılır, kullanıcı
// gönderir). Yapılabilen: `wa.me/<numara>?text=…` — cari kartındaki numarayla sohbet, sipariş
// özeti metin olarak HAZIR; kullanıcı yalnız "gönder"e basar. Dosyayı da eklemek isterse "Yazdır"
// ile inen dosyayı paylaşır. Numara normalize: 05xx → 905xx; +90 / 90 başı korunur.
function siparisMetinOzeti(siparis, cari) {
  const satirlar = [];
  satirlar.push(`*${siparis.tip === "Alış" ? "ALIŞ SİPARİŞİ" : "SİPARİŞ"} ${siparis.siparisNo || ""}*`);
  if (cari && cari.unvan) satirlar.push(cari.unvan);
  satirlar.push(`Tarih: ${(siparis.tarih || "").slice(0, 10)}${siparis.teslimTarihi ? ` · Teslim: ${siparis.teslimTarihi}` : ""}`);
  satirlar.push("");
  const gruplar = [];
  (siparis.kalemler || []).forEach((k) => {
    const anahtar = `${k.urunAd}|${k.renk || ""}`;
    let g = gruplar.find((x) => x.anahtar === anahtar);
    if (!g) { g = { anahtar, urunAd: k.urunAd, renk: k.renk || "", bedenler: [], toplam: 0, birim: k.birim || "" }; gruplar.push(g); }
    g.bedenler.push(`${k.beden || "—"}:${k.miktar}`);
    g.toplam += k.miktar || 0;
  });
  gruplar.forEach((g) => {
    satirlar.push(`• ${g.urunAd}${g.renk ? ` · ${g.renk}` : ""}`);
    satirlar.push(`  ${g.bedenler.join("  ")}  = ${g.toplam} ${g.birim}`);
  });
  const toplamAdet = (siparis.kalemler || []).reduce((t, k) => t + (k.miktar || 0), 0);
  satirlar.push("");
  satirlar.push(`Toplam: ${toplamAdet} ${(siparis.kalemler[0] || {}).birim || ""}`);
  if (siparis.not) satirlar.push(`Not: ${siparis.not}`);
  return satirlar.join("\n");
}

function whatsappNumarasi(ham) {
  let n = String(ham || "").replace(/[^\d+]/g, "");
  if (!n) return "";
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "90" + n.slice(1);          // 05xx… → 905xx…
  else if (/^5\d{9}$/.test(n)) n = "90" + n;             // 5xx… (başında 0 yok) → 905xx…
  return n;
}

function siparisWhatsappBaglantisi(siparis, cari) {
  const numara = whatsappNumarasi((cari && (cari.whatsapp || cari.telefon)) || "");
  const metin = encodeURIComponent(siparisMetinOzeti(siparis, cari));
  return numara ? `https://wa.me/${numara}?text=${metin}` : `https://wa.me/?text=${metin}`;
}

function siparisCiktisiHTML(siparis, cari, firmaBilgileri, stok) {
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const f = firmaBilgileri || {};
  const gruplar = [];
  (siparis.kalemler || []).forEach((k) => {
    const anahtar = `${k.urunAd}|${k.renk || ""}`;
    let g = gruplar.find((x) => x.anahtar === anahtar);
    if (!g) g = { anahtar, urunAd: k.urunAd, renk: k.renk || "", hucreler: {}, toplam: 0, birim: k.birim || "", birimFiyat: k.birimFiyat, paraBirimi: k.paraBirimi || "TRY", tutar: 0 }, gruplar.push(g);
    g.hucreler[k.beden || ""] = (g.hucreler[k.beden || ""] || 0) + (k.miktar || 0);
    g.toplam += k.miktar || 0;
    g.tutar += (k.miktar || 0) * (k.birimFiyat || 0);
    if (g.birimFiyat !== k.birimFiyat) g.birimFiyat = null; // farklı fiyatlar → "çeşitli"
  });
  const bedenler = bedenSirala([...new Set((siparis.kalemler || []).map((k) => k.beden || ""))]);
  const para = (v, pb) => `${Number(v || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb || ""}`;
  const toplamAdet = gruplar.reduce((t, g) => t + g.toplam, 0);
  const pbToplam = {};
  gruplar.forEach((g) => { pbToplam[g.paraBirimi] = (pbToplam[g.paraBirimi] || 0) + g.tutar; });
  const resimBul = (g) => { const u = (stok || []).find((x) => x.ad === g.urunAd); return u ? (((u.renkResimleri || {})[g.renk]) || u.kapakResmi || "") : ""; };
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #33281C;padding-bottom:8px;margin-bottom:12px">
      <div>
        ${f.logo ? `<img src="${f.logo}" style="height:40px;margin-bottom:4px" />` : ""}
        <div style="font-size:16px;font-weight:700">${esc(f.unvan || "")}</div>
        <div style="font-size:11px;color:#7A6A50">${esc(f.adres || "")}${f.telefon ? ` · ${esc(f.telefon)}` : ""}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;letter-spacing:1px;color:#7A6A50">${siparis.tip === "Alış" ? "ALIŞ SİPARİŞİ" : "SATIŞ SİPARİŞİ"}</div>
        <div class="mono" style="font-size:18px;font-weight:700">${esc(siparis.siparisNo || "")}</div>
        <div class="mono" style="font-size:11px">Tarih: ${esc((siparis.tarih || "").slice(0, 10))}${siparis.teslimTarihi ? ` · Teslim: ${esc(siparis.teslimTarihi)}` : ""}</div>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:11px;color:#7A6A50">${siparis.tip === "Alış" ? "Tedarikçi" : "Müşteri"}</div>
      <div style="font-size:14px;font-weight:700">${esc(cari ? cari.unvan : "")}</div>
      <div style="font-size:11px;color:#7A6A50">${esc((cari && cari.adres) || "")}${cari && cari.telefon ? ` · ${esc(cari.telefon)}` : ""}${siparis.musteriKodu ? ` · Müşteri kodu: ${esc(siparis.musteriKodu)}` : ""}</div>
    </div>
    <table>
      <thead><tr style="border-bottom:2px solid #33281C">
        <th></th><th>Ürün</th><th>Renk</th>
        ${bedenler.map((b) => `<th class="mono" style="text-align:center">${esc(b || "—")}</th>`).join("")}
        <th style="text-align:right;border-left:1px dashed #999">Toplam</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Tutar</th>
      </tr></thead>
      <tbody>
        ${gruplar.map((g) => `<tr style="border-bottom:1px solid #ddd">
          <td>${resimBul(g) ? `<img src="${resimBul(g)}" style="width:32px;height:32px;object-fit:cover;border-radius:4px" />` : ""}</td>
          <td style="font-weight:700">${esc(g.urunAd)}</td><td class="mono">${esc(g.renk)}</td>
          ${bedenler.map((b) => `<td class="mono" style="text-align:center">${g.hucreler[b] || "—"}</td>`).join("")}
          <td class="mono" style="text-align:right;font-weight:700;border-left:1px dashed #999">${g.toplam} ${esc(g.birim)}</td>
          <td class="mono" style="text-align:right">${g.birimFiyat == null ? "çeşitli" : para(g.birimFiyat, g.paraBirimi)}</td>
          <td class="mono" style="text-align:right">${para(g.tutar, g.paraBirimi)}</td>
        </tr>`).join("")}
      </tbody>
      <tfoot><tr style="border-top:2px solid #33281C;font-weight:700">
        <td colspan="${3 + bedenler.length}" style="text-align:right">Toplam</td>
        <td class="mono" style="text-align:right;border-left:1px dashed #999">${toplamAdet}</td><td></td>
        <td class="mono" style="text-align:right">${Object.entries(pbToplam).map(([pb, v]) => para(v, pb)).join(" + ")}</td>
      </tr></tfoot>
    </table>
    ${siparis.not ? `<div style="margin-top:12px;font-size:12px"><b>Not:</b> ${esc(siparis.not)}</div>` : ""}
    <div style="margin-top:24px;font-size:10px;color:#9B8B72">Atölye ERP · ${new Date().toLocaleDateString("tr-TR")}</div>`;
}

// ---- PDF (kullanıcı, 13 Eylül: "WhatsApp'tan fiş gönderme, ekrandakinin aynı bilgileri ve PDF
// şeklinde olması gerekli") ------------------------------------------------------------------------
//
// Çıktı HTML'i görünmez bir kapta çizilip html2canvas ile resme, jsPDF ile A4 sayfalara alınıyor.
// Kütüphaneler ANINDA YÜKLENİYOR (esm.sh, sürümler sabit) — uygulamanın açılışına yük bindirmiyor;
// internet yoksa `null` döner, çağıran HTML dosyasına düşer. Metin resim olarak gidiyor (Türkçe
// harfler için font gömmeye gerek yok); telefonda paylaşım için yeterli.
//
// Neden PDF metin değil resim: jsPDF'in kendi fontları ş/ğ/İ içermiyor; TTF gömmek dosya ve ağ
// yükü. Yazdırılabilir HTML (Yazdır → PDF olarak kaydet) metin kalıyor — ikisi de var.
let _pdfKutuphaneleri = null;
async function pdfKutuphaneleriniYukle() {
  if (_pdfKutuphaneleri) return _pdfKutuphaneleri;
  try {
    // `import()` DOĞRUDAN yazılmıyor: test derlemesi (CommonJS) onu `require`a çeviriyor ve
    // tarayıcıdaki `require` sahtesi anlamsız bir nesne döndürüyordu. Fonksiyon gövdesindeki
    // import ikisinde de gerçek dinamik import kalır.
    const dinamikImport = new Function("u", "return import(u)");
    const [{ jsPDF }, h2c] = await Promise.all([
      dinamikImport("https://esm.sh/jspdf@2.5.2"),
      dinamikImport("https://esm.sh/html2canvas@1.4.1"),
    ]);
    if (typeof jsPDF !== "function" || typeof (h2c.default || h2c) !== "function") throw new Error("beklenmeyen modül biçimi");
    _pdfKutuphaneleri = { jsPDF, html2canvas: h2c.default || h2c };
    return _pdfKutuphaneleri;
  } catch (e) {
    console.warn("PDF kütüphaneleri yüklenemedi:", e && e.message);
    return null;
  }
}

async function htmldenPdfBlob(govdeHTML) {
  const kut = await pdfKutuphaneleriniYukle();
  if (!kut) return null;
  const kap = document.createElement("div");
  // A4 genişliği (96dpi ≈ 794px); ekran dışında ama çizilebilir (display:none çizilmez).
  kap.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;padding:24px;background:#fff;color:#33281C;font-family:-apple-system,'Segoe UI',sans-serif;";
  kap.innerHTML = `<style>table{width:100%;border-collapse:collapse}th,td{padding:4px 8px;text-align:left;font-size:12px}.mono{font-family:'Courier New',monospace}img{max-width:100%}</style>${govdeHTML}`;
  document.body.appendChild(kap);
  try {
    const tuval = await kut.html2canvas(kap, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new kut.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const sayfaG = pdf.internal.pageSize.getWidth(), sayfaY = pdf.internal.pageSize.getHeight();
    const resimY = (tuval.height * sayfaG) / tuval.width;
    // Uzun çıktı: sayfa sayfa dilimleniyor.
    let kalan = resimY, konum = 0;
    const veri = tuval.toDataURL("image/jpeg", 0.92);
    while (kalan > 0) {
      if (konum > 0) pdf.addPage();
      pdf.addImage(veri, "JPEG", 0, -konum, sayfaG, resimY);
      kalan -= sayfaY; konum += sayfaY;
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(kap);
  }
}

function blobIndir(blob, dosyaAdi) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = dosyaAdi;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Sipariş çıktısını PDF olarak indirir; PDF üretilemezse (internet yok) yazdırılabilir HTML.
async function siparisPdfIndir(siparis, cari, firmaBilgileri, stok, showToast) {
  const ad = `${siparis.siparisNo || "siparis"} - ${(cari && cari.unvan) || "cari"}`.replace(/[^\w\-ğüşıöçĞÜŞİÖÇ .]/g, "");
  const govde = siparisCiktisiHTML(siparis, cari, firmaBilgileri, stok);
  const blob = await htmldenPdfBlob(govde);
  if (blob) { blobIndir(blob, `${ad}.pdf`); return "pdf"; }
  if (showToast) showToast("PDF kütüphanesi yüklenemedi (internet?) — yazdırılabilir dosya indirildi");
  htmlGovdesiniIndir(govde, ad);
  return "html";
}

// WhatsApp'a PDF: telefonda (Android/iOS) PAYLAŞ menüsü — dosya ekli, kullanıcı WhatsApp'ı ve
// kişiyi seçer (tarayıcı bir numaraya kendiliğinden dosya gönderemez; WhatsApp'ın kuralı).
// Paylaş menüsü olmayan bilgisayarda: PDF indirilir + numaraya sohbet açılır, dosya elle eklenir.
async function siparisWhatsappGonder(siparis, cari, firmaBilgileri, stok, showToast) {
  const ad = `${siparis.siparisNo || "siparis"} - ${(cari && cari.unvan) || "cari"}`.replace(/[^\w\-ğüşıöçĞÜŞİÖÇ .]/g, "");
  const govde = siparisCiktisiHTML(siparis, cari, firmaBilgileri, stok);
  const blob = await htmldenPdfBlob(govde);
  const metin = siparisMetinOzeti(siparis, cari);
  if (blob) {
    const dosya = new File([blob], `${ad}.pdf`, { type: "application/pdf" });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [dosya] })) {
      try {
        await navigator.share({ files: [dosya], title: ad, text: `${siparis.tip === "Alış" ? "Alış siparişi" : "Sipariş"} ${siparis.siparisNo || ""} — ${(cari && cari.unvan) || ""}` });
        return "paylasildi";
      } catch (e) {
        if (e && e.name === "AbortError") return "vazgecildi";
      }
    }
    blobIndir(blob, `${ad}.pdf`);
    if (showToast) showToast("PDF indirildi — WhatsApp açılıyor, dosyayı sohbete ekleyin");
  } else if (showToast) {
    showToast("PDF üretilemedi (internet?) — özet metinle WhatsApp açılıyor");
  }
  window.open(siparisWhatsappBaglantisi(siparis, cari), "_blank", "noopener");
  return blob ? "indirildi" : "metin";
}

// E-POSTA — WHATSAPP'LA AYNI YOL (kullanıcı, 13 Eylül: "maili PDF olarak aynı WhatsApp'taki gibi
// gönderelim"). Telefonda paylaş menüsü PDF EKLİ açılır, kullanıcı Gmail/Outlook'u seçer; alıcı
// adresi ve konu metne yazılıyor, adres ayrıca PANOYA kopyalanıyor (paylaş menüsü alıcıyı
// kendiliğinden dolduramaz — yapıştırmak yeter). SMTP kurulumu GEREKMİYOR.
//
// Tanımlar'da SMTP ayarları DOLUYSA (isteğe bağlı) önce `eposta` fonksiyonuyla doğrudan cari
// adresine gönderilir; başarısızsa paylaş yoluna düşer. Paylaş menüsü olmayan bilgisayarda:
// PDF iner + `mailto:` (alıcı ve konu dolu), dosya elle eklenir.
async function siparisEpostaGonder(siparis, cari, firmaBilgileri, stok, showToast) {
  const kime = (cari && cari.eposta) || "";
  const ad = `${siparis.siparisNo || "siparis"} - ${(cari && cari.unvan) || "cari"}`.replace(/[^\w\-ğüşıöçĞÜŞİÖÇ .]/g, "");
  const konu = `${siparis.tip === "Alış" ? "Alış siparişi" : "Sipariş"} ${siparis.siparisNo || ""} — ${(firmaBilgileri && firmaBilgileri.unvan) || ""}`.trim();
  const metin = siparisMetinOzeti(siparis, cari).replace(/\*/g, "");
  const govde = siparisCiktisiHTML(siparis, cari, firmaBilgileri, stok);
  const blob = await htmldenPdfBlob(govde);

  // 1) SMTP kuruluysa doğrudan gönder (isteğe bağlı yol).
  const smtp = (firmaBilgileri && firmaBilgileri.eposta) || {};
  if (blob && kime && smtp.sunucu && smtp.kullanici && smtp.sifre) {
    const base64 = await new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.onerror = red; r.readAsDataURL(blob); });
    const sonuc = await epostaGonder({ kime, konu, metin, dosyaAdi: `${ad}.pdf`, pdfBase64: base64 });
    if (sonuc.tamam) { if (showToast) showToast(`E-posta gönderildi: ${kime}`); return "gonderildi"; }
    if (showToast) showToast(`Doğrudan gönderilemedi (${sonuc.hata}) — paylaşım menüsü açılıyor`);
  }

  // 2) Paylaş menüsü (WhatsApp'la aynı): PDF ekli, alıcı panoda.
  if (blob) {
    const dosya = new File([blob], `${ad}.pdf`, { type: "application/pdf" });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [dosya] })) {
      if (kime && navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(kime); if (showToast) showToast(`Alıcı adres panoya kopyalandı: ${kime} — posta uygulamasını seçip "Kime"ye yapıştırın`); } catch (e) { /* pano izni yok */ }
      } else if (!kime && showToast) {
        showToast("Cari kartında e-posta yok — alıcıyı posta uygulamasında yazın");
      }
      try {
        await navigator.share({ files: [dosya], title: konu, text: `${kime ? `Kime: ${kime}\n` : ""}${konu}\n\n${metin}` });
        return "paylasildi";
      } catch (e) {
        if (e && e.name === "AbortError") return "vazgecildi";
      }
    }
    blobIndir(blob, `${ad}.pdf`);
    if (showToast) showToast("PDF indirildi — posta programı açılıyor, dosyayı ekleyin");
  } else {
    if (showToast) showToast("PDF üretilemedi (internet?) — yazdırılabilir dosya indirildi, posta programı açılıyor");
    htmlGovdesiniIndir(govde, ad);
  }
  window.location.href = `mailto:${encodeURIComponent(kime)}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(metin)}`;
  return "mailto";
}

// ================= PAYLAŞ ŞERİDİ =================
//
// Kullanıcı (13 Eylül): "Mail ve WhatsApp gönderimini ekstre olarak aldığımız her yerde sık sık
// kullanacağız. Buna bir ad verelim." — ADI: **Paylaş Şeridi** (`PaylasSeridi`). Bir belgeyi
// (sipariş, fiş, ekstre, reçete…) üç yolla verir: PDF indir · WhatsApp · E-posta. Belge ya hazır
// HTML gövdesi (`govdeHTML`) ya da ekrandaki bir alanın seçicisi (`govdeSecici`, `.yazdir-alani`
// gibi); ikinci durumda tıklandığı anda DOM'dan okunur — ekranda ne varsa o gider.
//
// Tek mantık (sipariş çıktısıyla aynı, 8y/9a): PDF html2canvas+jsPDF ile; WhatsApp/E-posta telefonda
// paylaş menüsü (PDF ekli), bilgisayarda PDF iner + wa.me / mailto. Alıcı cari kartından
// (whatsapp/telefon, eposta). Her yerde AYNI üç düğme, aynı davranış — modül başına yeniden yazılmaz.
async function belgeyiPaylas(yol, { govdeHTML, govdeSecici, dosyaAdi, cari, konu, ozet, showToast, firmaBilgileri }) {
  let govde = govdeHTML;
  if (!govde && govdeSecici) {
    const el = document.querySelector(govdeSecici);
    if (!el) { if (showToast) showToast("Belge alanı bulunamadı"); return "yok"; }
    govde = el.innerHTML;
  }
  if (!govde) return "yok";
  const ad = String(dosyaAdi || "belge").replace(/[^\w\-ğüşıöçĞÜŞİÖÇ .]/g, "");
  // DOĞRUDAN YAZDIRMA (24 Eylül, v1.441.0 — kullanıcı: "sipariş doğrudan yazdırma yok, PDF var,
  // yazdırma ekle"). PDF ÜRETMEDEN önce dönüyor: yazdırmanın PDF kütüphanesine ihtiyacı yok,
  // internet yokken de çalışmalı. Gizli bir çerçevede aynı belge gövdesi açılıp yazıcı penceresi
  // çağrılıyor — yeni sekme açmak yerine, çünkü telefon tarayıcıları açılır pencereyi engelliyor.
  if (yol === "yazdir") { belgeyiYazdir(govde, ad); return "yazdir"; }
  const blob = await htmldenPdfBlob(govde);
  if (yol === "pdf") {
    if (blob) { blobIndir(blob, `${ad}.pdf`); return "pdf"; }
    if (showToast) showToast("PDF kütüphanesi yüklenemedi (internet?) — yazdırılabilir dosya indirildi");
    htmlGovdesiniIndir(govde, ad);
    return "html";
  }
  const metin = ozet || konu || ad;
  if (yol === "whatsapp") {
    const numara = whatsappNumarasi((cari && (cari.whatsapp || cari.telefon)) || "");
    if (blob) {
      const dosya = new File([blob], `${ad}.pdf`, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [dosya] })) {
        try { await navigator.share({ files: [dosya], title: konu || ad, text: metin }); return "paylasildi"; }
        catch (e) { if (e && e.name === "AbortError") return "vazgecildi"; }
      }
      blobIndir(blob, `${ad}.pdf`);
      if (showToast) showToast("PDF indirildi — WhatsApp açılıyor, dosyayı sohbete ekleyin");
    } else if (showToast) showToast("PDF üretilemedi (internet?) — özet metinle WhatsApp açılıyor");
    window.open(numara ? `https://wa.me/${numara}?text=${encodeURIComponent(metin)}` : `https://wa.me/?text=${encodeURIComponent(metin)}`, "_blank", "noopener");
    return blob ? "indirildi" : "metin";
  }
  if (yol === "eposta") {
    const kime = (cari && cari.eposta) || "";
    const smtp = (firmaBilgileri && firmaBilgileri.eposta) || {};
    if (blob && kime && smtp.sunucu && smtp.kullanici && smtp.sifre) {
      const base64 = await new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.onerror = red; r.readAsDataURL(blob); });
      const sonuc = await epostaGonder({ kime, konu: konu || ad, metin, dosyaAdi: `${ad}.pdf`, pdfBase64: base64 });
      if (sonuc.tamam) { if (showToast) showToast(`E-posta gönderildi: ${kime}`); return "gonderildi"; }
      if (showToast) showToast(`Doğrudan gönderilemedi (${sonuc.hata}) — paylaşım menüsü açılıyor`);
    }
    if (blob) {
      const dosya = new File([blob], `${ad}.pdf`, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [dosya] })) {
        if (kime && navigator.clipboard && navigator.clipboard.writeText) {
          try { await navigator.clipboard.writeText(kime); if (showToast) showToast(`Alıcı adres panoya kopyalandı: ${kime}`); } catch (e) { /* */ }
        }
        try { await navigator.share({ files: [dosya], title: konu || ad, text: `${kime ? `Kime: ${kime}\n` : ""}${konu || ad}\n\n${metin}` }); return "paylasildi"; }
        catch (e) { if (e && e.name === "AbortError") return "vazgecildi"; }
      }
      blobIndir(blob, `${ad}.pdf`);
      if (showToast) showToast("PDF indirildi — posta programı açılıyor, dosyayı ekleyin");
    } else {
      if (showToast) showToast("PDF üretilemedi (internet?) — yazdırılabilir dosya indirildi, posta programı açılıyor");
      htmlGovdesiniIndir(govde, ad);
    }
    window.location.href = `mailto:${encodeURIComponent(kime)}?subject=${encodeURIComponent(konu || ad)}&body=${encodeURIComponent(metin)}`;
    return "mailto";
  }
  return "yok";
}

// Üç düğme. `kucuk`: kart başlıklarına sığan boyut. Düğmeler işlem bitene kadar kilitli.
function PaylasSeridi({ govdeHTML, govdeSecici, dosyaAdi, cari, konu, ozet, showToast, firmaBilgileri, kucuk, pdfEtiket }) {
  const [mesgul, setMesgul] = useState(false);
  const calistir = async (yol, e) => {
    if (e) e.stopPropagation();
    setMesgul(true);
    try { await belgeyiPaylas(yol, { govdeHTML, govdeSecici, dosyaAdi, cari, konu, ozet, showToast, firmaBilgileri }); }
    finally { setMesgul(false); }
  };
  const numara = whatsappNumarasi((cari && (cari.whatsapp || cari.telefon)) || "");
  const kime = (cari && cari.eposta) || "";
  const stil = kucuk ? { padding: "2px 7px", fontSize: 10 } : { padding: "3px 8px", fontSize: 11 };
  return (
    <span data-paylas-seridi={dosyaAdi || ""} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {/* YAZDIR, PDF'İN SOLUNDA (24 Eylül, v1.441.0): kâğıda basmak en sık yapılan iş; PDF
          çoğunlukla paylaşmak için. Yazdırma PDF kütüphanesini beklemiyor, `mesgul` iken de basılır. */}
      <button type="button" className="btn-ghost" data-paylas-yazdir="1" title="Doğrudan yazdır" style={stil} onClick={(e) => calistir("yazdir", e)}>
        <Printer size={kucuk ? 10 : 11} /> Yazdır
      </button>
      <button type="button" className="btn-ghost" data-paylas-pdf="1" disabled={mesgul} title="PDF indir" style={stil} onClick={(e) => calistir("pdf", e)}>
        <FileText size={kucuk ? 10 : 11} /> {mesgul ? "…" : (pdfEtiket || "PDF")}
      </button>
      <button type="button" className="btn-ghost" data-paylas-whatsapp={numara || "numarasiz"} disabled={mesgul}
        title={numara ? `WhatsApp'tan PDF gönder: ${cari.whatsapp || cari.telefon}` : "Kartta WhatsApp / telefon yok — kişiyi WhatsApp'ta seçersiniz"}
        style={{ ...stil, color: numara ? "#25763D" : "var(--erp-text-3)", borderColor: numara ? "#25763D" : undefined }} onClick={(e) => calistir("whatsapp", e)}>
        <MessageCircle size={kucuk ? 10 : 11} /> WhatsApp
      </button>
      <button type="button" className="btn-ghost" data-paylas-eposta={kime || "adressiz"} disabled={mesgul}
        title={kime ? `PDF'i e-postayla gönder: ${kime}` : "Kartta e-posta yok — alıcıyı posta uygulamasında yazarsınız"}
        style={{ ...stil, color: kime ? "var(--erp-info)" : "var(--erp-text-3)" }} onClick={(e) => calistir("eposta", e)}>
        <Mail size={kucuk ? 10 : 11} /> E-posta
      </button>
    </span>
  );
}

// BELGEYİ DOĞRUDAN YAZDIR (24 Eylül, v1.441.0): dosya indirmeden, yazıcı penceresini açar.
// Gizli `iframe` kullanılıyor: `window.open` telefon tarayıcılarında açılır pencere engeline
// takılıyor ve kullanıcı "hiçbir şey olmadı" diyordu. Yazdırma bitince çerçeve kaldırılıyor.
function belgeyiYazdir(govdeHTML, baslik) {
  const cerceve = document.createElement("iframe");
  cerceve.setAttribute("aria-hidden", "true");
  cerceve.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(cerceve);
  const kaldir = () => { if (cerceve.parentNode) cerceve.parentNode.removeChild(cerceve); };
  const belge = cerceve.contentDocument || (cerceve.contentWindow && cerceve.contentWindow.document);
  if (!belge) { kaldir(); return false; }
  belge.open();
  belge.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${baslik || "Yazdır"}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 16px; color: #33281C; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 8px; text-align: left; font-size: 12px; }
      img { max-width: 100%; }
      .mono { font-family: 'Courier New', monospace; }
      .no-print { display: none !important; }
      @page { margin: 12mm; }
    </style></head><body>${govdeHTML}</body></html>`);
  belge.close();
  const bas = () => {
    try {
      cerceve.contentWindow.focus();
      cerceve.contentWindow.print();
    } catch (e) { /* yazdırma reddedilirse sessiz kal: kullanıcı PDF'i kullanabilir */ }
    // Yazdırma penceresi kapanmadan çerceveyi almak Safari'de boş çıktıya yol açıyor.
    setTimeout(kaldir, 60000);
  };
  // Görseller yüklenmeden basılırsa logo/ürün resimleri boş çıkıyor.
  if (cerceve.contentWindow.document.readyState === "complete") setTimeout(bas, 100);
  else cerceve.contentWindow.addEventListener("load", () => setTimeout(bas, 100));
  return true;
}

function indirYazdirilabilirHTML(secici, dosyaAdi) {
  const el = document.querySelector(secici);
  if (!el) {
    alert("Yazdırılacak içerik bulunamadı — lütfen tekrar deneyin.");
    return;
  }
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${dosyaAdi || "Yazdır"}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #33281C; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 8px; text-align: left; font-size: 12px; }
          img { max-width: 100%; }
          .mono { font-family: 'Courier New', monospace; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body onload="window.print()">${el.innerHTML}</body>
    </html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(dosyaAdi || "yazdir").replace(/[^\w\-ğüşıöçĞÜŞİÖÇ ]/g, "")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Bir proses adımının, siparişin beden bazlı miktarlarına göre HER BEDEN için ayrı ayrı ne kadarının
// (hangi atamalarla) dağıtıldığını ve ne kadarının kaldığını hesaplar. Böylece bir personel "38
// numaradan 10, 39 numaradan 20" gibi beden bazlı bir miktar üstlenebilir, ve her beden kendi
// kotasını aşmadan (toplam adet üzerinden değil, beden bazında) doğru şekilde takip edilir.
// Bir prosese ait bedenlerin toplam/dağıtılmış/kalan miktarlarını hesaplar. `ustSinirBedenler`
// verilirse (önceki prosesten kısmen teslim alınmış akış miktarları), her bedenin "toplam"ı artık
// siparişin tamamı DEĞİL, önceki adımdan o beden için o ana kadar GERÇEKTEN akmış (teslim alınmış)
// miktarla sınırlıdır — böylece bir sonraki proses, önceki proses tamamen bitmeden de, biten kısmı
// kadar iş dağıtabilir.
// =============================================================================================
// TESLİM SONUCU: SAĞLAM / TAMİR / HURDA
//
// Bir atama teslim alınırken üç sonuç olabilir ve üçü BİRBİRİNDEN FARKLI davranır:
//
//   SAĞLAM  — sonraki prosese akar, mamul stoğuna girer.
//   TAMİR   — çift kaybolmaz; seçilen prosese geri döner, düzeltilip akışa katılır.
//             Harcanan malzeme çöpe gitmez. Tamir işçiliği DEĞİŞKENDİR, elle girilir.
//   HURDA   — çift gider. O aşamaya kadar harcanan hammadde kayıptır (geri alınmaz).
//             Hurdanın çıktığı aşamanın ücreti o adet için ÖDENMEZ; önceki aşamalarda
//             ödenmiş ücretler durur — o işler gerçekten yapılmıştı.
//             Sipariş eksik kalmasın diye hurda adedi kadar YENİ üretim başlatılır.
//
// Eski atamalarda `sonuc` alanı yoktur; o durumda tamamı sağlam sayılır (geriye dönük uyum).
function atamaSonucu(atama) {
  const s = atama && atama.sonuc;
  if (!s) return { saglam: { ...(atama.bedenMiktarlari || {}) }, tamir: [], hurda: [] };
  return { saglam: s.saglam || {}, tamir: s.tamir || [], hurda: s.hurda || [] };
}

const bedenToplami = (harita) => Object.values(harita || {}).reduce((t, x) => t + (x || 0), 0);

function adimBedenDurumu(adim, siparisBedenMiktarlari, ustSinirBedenler) {
  return (siparisBedenMiktarlari || []).map((bm) => {
    const dagitilan = (adim.atamalar || []).reduce((s, a) => s + ((a.bedenMiktarlari || {})[bm.beden] || 0), 0);
    const ustSinir = ustSinirBedenler ? (ustSinirBedenler[bm.beden] ?? 0) : bm.miktar;
    const toplam = Math.min(bm.miktar, ustSinir);
    return { beden: bm.beden, toplam, dagitilan, kalan: Math.max(0, toplam - dagitilan) };
  });
}

// Bir proses adımına (adimIndex), hemen ÖNCEKİ adımdan o ana kadar AKMIŞ (teslim alınmış) beden
// bazlı miktarları hesaplar. İlk adımın (adimIndex 0) önünde bekleyen bir proses yoktur — sipariş
// miktarının tamamı baştan mevcuttur. Önceki adım bir ARA PROSES ise (atomik çalışır, kısmi teslim
// kavramı yok), tamamlandiMi ise TÜM sipariş miktarı akmış sayılır. Önceki adım GERÇEK bir prosesse,
// sadece o adımda TESLİM ALINMIŞ (tamamlandiMi=true) atamaların bedenMiktarları akmış sayılır — henüz
// teslim alınmamış (rezerve/verilmiş ama bitmemiş) atamalar bir sonraki prosese henüz akıtılmaz.
function oncekiAdimdanMevcutBedenler(prosesIlerleme, adimIndex, siparisBedenMiktarlari) {
  const sonuc = {};
  (siparisBedenMiktarlari || []).forEach((bm) => { sonuc[bm.beden] = 0; });
  if (adimIndex <= 0) {
    (siparisBedenMiktarlari || []).forEach((bm) => { sonuc[bm.beden] = bm.miktar; });
    return sonuc;
  }
  const oncekiAdim = prosesIlerleme[adimIndex - 1];
  if (!oncekiAdim) return sonuc;
  if (oncekiAdim.araProsesMi) {
    // Ara proses adımları, kendisinden sonraki asıl prosese İLK KEZ iş verildiği anda OTOMATIK
    // olarak tamamlanır (bkz. uretimProsesVer'deki araProsesOtomatikTamamlanacakMi) — yani ara proses
    // hiçbir zaman bağımsız bir "bekleme" oluşturmaz. Bu yüzden burada tamamlandiMi'sine bakılmaksızın
    // (henüz false olsa bile) TÜM sipariş miktarının aktığı kabul edilir; aksi halde, ara prosesten
    // sonraki gerçek proses, ara proses "az önce otomatik tamamlanacak olsa bile" yanlışlıkla akışsız
    // (sıfır) görünür ve iş verilemez hale gelirdi.
    (siparisBedenMiktarlari || []).forEach((bm) => { sonuc[bm.beden] = bm.miktar; });
    return sonuc;
  }
  // Sonraki prosese yalnızca SAĞLAM çiftler akar. Hurda gitmiştir; tamirdeki çift ise geri
  // döndüğü proseste yeniden akışa girecektir — ikisini de burada akıtmak, olmayan malı bir
  // sonraki prosese vermek olurdu.
  (oncekiAdim.atamalar || []).filter((a) => a.tamamlandiMi).forEach((a) => {
    Object.entries(atamaSonucu(a).saglam).forEach(([beden, miktar]) => {
      sonuc[beden] = (sonuc[beden] || 0) + miktar;
    });
  });
  return sonuc;
}

// Bir ürün için, verilen renk/beden/cari'ye göre EN UYGUN fiyatı ve bu fiyatın hangi kuraldan geldiğini
// bulur. Öncelik sırası (en spesifikten en genele): 1) bu cariye özel kural (grup harici, en güçlü)
// 2) carinin bağlı olduğu fiyat grubuna özel kural 3) hem bu renk hem bu bedene özel kural
// 4) sadece bu renge özel kural 5) sadece bu bedene özel kural 6) ürünün genel alış/satış fiyatı.
// Böylece "renk/beden/tedarikçi/alıcıya göre değişen fiyat + gruplar + grup harici özel fiyat" tek bir
// tutarlı kuralla çözülür — sipariş formunda ürün/renk/cari seçilir seçilmez doğru fiyat otomatik gelir.
// ---- SON ALIŞ FİYATLARI ----------------------------------------------------------------------------
//
// Kullanıcı (12 Eylül): "Alış fiyatlarında son alış fiyatlarını hatırla, not düş; hatta stok kartı
// içinde fiyatlara son alış fiyatlarını listele — alış fiyatı ile gerçekleşen alışlar arasındaki
// farkları tespit etmek için."
//
// KAYNAK: cari hareketleri. Alış fişi kesildiğinde her kalem cariye ürün adı, renk, beden, miktar
// ve birim fiyatla yazılıyor (bkz. fisYaz); stok hareketinde fiyat YOK. Ayrı bir "son fiyat" alanı
// tutulmuyor — tutulsaydı fiş geri alınınca geride kalır ve olmamış bir alışı hatırlatırdı.
// Hareket silinince liste kendiliğinden düzeliyor.
//
// Eşleşme ÜRÜN ADIYLA (hareket ürün kimliği taşımıyor); harf duyarsız. Fiyat kalemin KENDİ
// biriminde: çevrim yapıldıysa `hamBirimFiyat` + `kalemParaBirimi`, yoksa `birimFiyat` + `paraBirimi`.
// Yalnız ALIŞ fişleri (fiş no ön eki `AF`); iade/satış karışmıyor. En yeni önce.
function sonAlisFiyatlari(cariler, urunAd, { renk = null, sinir = 20 } = {}) {
  const ad = String(urunAd || "").toLocaleLowerCase("tr-TR").trim();
  if (!ad) return [];
  const onEk = `${fisOnEki("Alış")}-`;
  const liste = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!h.fisNo || !String(h.fisNo).startsWith(onEk)) return;
    if (String(h.urunAd || "").toLocaleLowerCase("tr-TR").trim() !== ad) return;
    if (renk != null && String(h.renk || "") !== String(renk)) return;
    const fiyat = h.hamBirimFiyat != null && h.kalemParaBirimi ? h.hamBirimFiyat : h.birimFiyat;
    if (!(fiyat > 0)) return;
    liste.push({
      tarih: h.tarih || "", zaman: h.zaman || "", cariId: c.id, cariAd: c.unvan || "", fisNo: h.fisNo,
      renk: h.renk || "", beden: h.beden || "", miktar: h.miktar || 0, birim: h.birim || "",
      fiyat, paraBirimi: (h.hamBirimFiyat != null && h.kalemParaBirimi) ? h.kalemParaBirimi : (h.paraBirimi || "TRY"),
    });
  }));
  liste.sort((a, b) => (b.tarih + b.zaman).localeCompare(a.tarih + a.zaman));
  return liste.slice(0, sinir);
}

function fiyatBul(urun, renk, beden, cariId, tip, cariler) {
  // PARA BİRİMİ (21 Eylül): kural artık kendi para birimini taşıyor (`paraBirimi`); yoksa ürün
  // kartındaki birim, o da yoksa TRY. Çağıran taraf fişin birimine çevirir (`fiyatFiseCevir`).
  const varsayilan = tip === "Satış" ? (urun.satisFiyati || 0) : (urun.alisFiyati || 0);
  const varsayilanPb = alisPbKodu({ alisParaBirimi: tip === "Satış" ? urun.satisParaBirimi : urun.alisParaBirimi });
  if (!urun) return { fiyat: varsayilan, kaynak: "Genel", paraBirimi: varsayilanPb };
  const kurallar = (urun.fiyatKurallari || []).filter((k) => k.tip === tip);
  if (kurallar.length === 0) return { fiyat: varsayilan, kaynak: "Genel", paraBirimi: varsayilanPb };

  // CARİYE ÖZEL — RENK/BEDEN KIRILIMIYLA (kullanıcı, 17 Eylül: "tekil cari için fiyatın alış satış
  // olduğunu, renk beden seçimi de olması gerekir").
  //
  // Cari kuralı önce "bu cariye hep şu fiyat" demekti. Ama aynı müşteriye siyahı başka, bejı başka
  // fiyata satmak sık: deri maliyeti renge göre değişiyor. Kural artık isteğe bağlı `renk`/`beden`
  // taşıyor ve EN ÖZELİ kazanıyor: cari+renk+beden → cari+renk → cari+beden → cari.
  // (Eski kayıtlarda renk/beden yok; onlar "cari" seviyesinde çalışmaya devam ediyor.)
  const cariKurallari = cariId ? kurallar.filter((k) => k.kapsam === "cari" && k.deger === cariId) : [];
  const cariOzel = cariKurallari.find((k) => k.renk && k.beden && k.renk === renk && k.beden === beden)
    || cariKurallari.find((k) => k.renk && !k.beden && k.renk === renk)
    || cariKurallari.find((k) => k.beden && !k.renk && k.beden === beden)
    || cariKurallari.find((k) => !k.renk && !k.beden);
  if (cariOzel) {
    const ek = [cariOzel.renk, cariOzel.beden].filter(Boolean).join("/");
    return { fiyat: cariOzel.fiyat, kaynak: ek ? `Cariye özel (${ek})` : "Cariye özel", paraBirimi: cariOzel.paraBirimi || varsayilanPb };
  }

  const cari = cariId ? (cariler || []).find((c) => c.id === cariId) : null;
  const grupKurali = cari && cari.fiyatGrubuId && kurallar.find((k) => k.kapsam === "fiyatGrubu" && k.deger === cari.fiyatGrubuId);
  if (grupKurali) return { fiyat: grupKurali.fiyat, kaynak: "Fiyat grubu", paraBirimi: grupKurali.paraBirimi || varsayilanPb };

  const renkBedenKurali = renk && beden && kurallar.find((k) => k.kapsam === "renkBeden" && k.deger === `${renk}|${beden}`);
  if (renkBedenKurali) return { fiyat: renkBedenKurali.fiyat, kaynak: "Renk+Beden", paraBirimi: renkBedenKurali.paraBirimi || varsayilanPb };

  const renkKurali = renk && kurallar.find((k) => k.kapsam === "renk" && k.deger === renk);
  if (renkKurali) return { fiyat: renkKurali.fiyat, kaynak: "Renk", paraBirimi: renkKurali.paraBirimi || varsayilanPb };

  const bedenKurali = beden && kurallar.find((k) => k.kapsam === "beden" && k.deger === beden);
  if (bedenKurali) return { fiyat: bedenKurali.fiyat, kaynak: "Beden", paraBirimi: bedenKurali.paraBirimi || varsayilanPb };

  return { fiyat: varsayilan, kaynak: "Genel", paraBirimi: varsayilanPb };
}



// FİYATI FİŞİN BİRİMİNE ÇEVİR (21 Eylül): "Toptan USD" grubunun 12 $'ı TL çalışan cariye
// kesilen fişte 12 ₺ olarak geçiyordu — kural para birimi taşımıyordu. Önce TL'ye, sonra fişin
// birimine; kur yoksa çevirmeden bırakır ve `cevrilemedi` der (çağıran uyarır).
function fiyatFiseCevir(fiyat, kaynakPb, fisPb, kurlar) {
  const kPb = alisPbKodu({ alisParaBirimi: kaynakPb }); const hPb = alisPbKodu({ alisParaBirimi: fisPb });
  if (!(fiyat > 0) || kPb === hPb) return { fiyat, cevrilemedi: false };
  const kur = (pb) => (pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0);
  if (!kur(kPb) || !kur(hPb)) return { fiyat, cevrilemedi: true };
  return { fiyat: Math.round((fiyat * kur(kPb) / kur(hPb)) * 10000) / 10000, cevrilemedi: false };
}
